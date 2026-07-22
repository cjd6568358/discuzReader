import http from './http';
import selectors from './selectors';
import { MMStore } from './index';

const title_regex = new RegExp('^.*?\\|\\s*(.*?)\\s*$', 'g');
export const getHomePage = async () => {
    try {
        const res = await http.get(`index.php`, { selector: selectors.home })
        return {
            // 网站标题
            title: res.data.title,
            // 网站logo
            iconUrl: res.data.iconUrl,
            // 公告列表
            announcementList: res.data.announcementList,
            // 版块列表
            sectionList: res.data.sectionList.map(item => {
                return {
                    name: item.name.replace(title_regex, '$1'),
                    children: item.children.map(i => ({
                        ...i,
                        name: i.name.replace(title_regex, '$1'),
                    })),
                    moderators: item.moderators,
                }
            }),
            // 积分列表
            creditList: res.data.creditList,
            // 用户名
            username: res.data.username,
        }
    } catch (error) {
        console.log('getHomePage', error);
        return Promise.reject(error)
    }
}

export const getPMInboxPage = async () => {
    try {
        const res = await http.get(`pm.php?folder=inbox`, { selector: selectors.pm })
        return res.data.pmList
    } catch (error) {
        console.log('getPMInboxPage', error);
        return Promise.reject(error)
    }
}

export const getPMTrackPage = async () => {
    try {
        const res = await http.get(`pm.php?folder=track`, { selector: selectors.pm })
        return res.data.pmList
    } catch (error) {
        console.log('getPMTrackPage', error);
        return Promise.reject(error)
    }
}

export const messageAction = async ({ action = 'view', id, data, type }) => {
    try {
        if (action === 'view') {
            const res = await http.get(`pm.php?action=${action}&folder=inbox&pmid=${id}&inajax=1`)
            return res.data.replace(/.*<!\[CDATA\[\s*<br\s*\/?>\s*(.*?)<div class="postactions".*/s, '$1')
        } else if (action === 'delete') {
            if (Array.isArray(id)) {
                const payload = {
                    formhash: '02823f08',
                    pmsend: true,
                }
                id.forEach(key => {
                    payload[`delete[]`] = key;
                })
                const res = await http.post(`pm.php?action=${action}&folder=${type}`, payload)
            } else {
                const res = await http.get(`pm.php?action=${action}&folder=${type}&pmid=${id}`)
            }
        } else if (action === 'markunread') {
            const res = await http.get(`pm.php?action=${action}&folder=inbox&pmid=${id}`)
        } else if (action === 'send') {
            const res = await http.post(`pm.php?action=send&inajax=1`, data)
        } else if (action === 'reply') {
            const res = await http.get(`pm.php?action=send&pmid=${data.pmid}&do=reply`, { selector: selectors.reply })
            await http.post(`pm.php?action=send&pmsubmit=yes`, { ...data, formhash: res.data.formhash })
        }

    } catch (error) {
        console.log('messageAction', error);
    }
}

export const getForumPage = async (href) => {
    try {
        const res = await http.get(href, { selector: href.includes('search.php?searchid=') ? selectors.searchResult : selectors.forum })
        const { title = '', breadcrumb = [], pagination } = res.data
        const newData = {
            ...res.data,
            title: title.replace(title_regex, '$1'),
            breadcrumb: breadcrumb.map(item => ({
                ...item,
                name: item.name.replace(title_regex, '$1'),
            }))
        }
        if (href.includes('search.php?searchid=')) {
            newData.action_tags = []
            newData.categorys = [{
                name: '全部',
                threads: newData.threads,
            }]
            newData.children = []
            newData.filter_tags = []
            newData.title = '搜索结果'
        }
        if (pagination) {
            newData.pagination = {
                ...pagination,
                last: pagination.last || pagination.siblings.at(-1)?.page,
            }
        }
        return newData
    } catch (error) {
        console.log('getForumPage', error);
        return Promise.reject(error)
    }
}

export const getThreadPage = async (href) => {
    // thread-6379736-1-1.html(#pid110991881) 不需要解析
    // /thread-\d*-\d*-\d*.html/.test(href)
    if (/viewthread\.php\?tid=(\d+)(?:&page=(\d+))?(?:#(\d+))?/.test(href)) {
        // viewthread.php?tid=6369158(&page=1(#pid110991881))
        const [, tid, page = 1, anchor] = href.match(/viewthread\.php\?tid=(\d+)(?:&page=(\d+))?(?:#(\d+))?/)
        href = `thread-${tid}-${page}-1.html${anchor ? `#${anchor}` : ''}`
    }
    let result = null
    let isCache = false
    if (MMStore.cached[href]) {
        result = MMStore.cached[href]
        isCache = true
    } else {
        result = await http.get(href, { selector: selectors.thread })
    }
    try {
        const { title, breadcrumb, posts, pagination } = result.data
        const imgSrcList = [];
        const newData = {
            ...result.data,
            title: title.replace(title_regex, '$1'),
            breadcrumb: breadcrumb.map(item => ({
                ...item,
                name: item.name.replace(title_regex, '$1'),
            })),
            posts: posts.map(item => {
                let content = (item.content ?? '')
                    .replace(/[\t]/g, ``)// 移除tab字符
                    .replace(/(\S)(<br>)(\S)/g, "$1$3")// 去掉非空白字符之间的<br>（修复Discuz常见的多余换行）
                    .replace(/="https?:\/\/(.*)\/bbs\//g, `="${http.defaults.baseURL}`)// 把绝对URL转成相对路径（适配baseURL）
                    .replace(/="attachment/g, `="${http.defaults.baseURL}attachment`)// 附件路径补全baseURL
                    .replace(/="images/g, `="${http.defaults.baseURL}images`)// 图片路径补全baseURL
                    // 移除 <style>、<script>、注释、<meta>、<link> 这些对渲染完全无用的标签
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<!--[\s\S]*?-->/g, '')
                    .replace(/<meta[^>]*>/gi, '')
                    .replace(/<link[^>]*>/gi, '')
                    + '<br>' + (item.notice ?? '');// 拼接帖子底部的通知/提示信息
                // 使用正则表达式提取 src 属性
                const regex = /<img[^>]+src=["']([^"']+)["']/g;
                let match;
                while ((match = regex.exec(content)) !== null) {
                    if (!/images\/(smilies|green|attachicons)\//.test(match[1])) {
                        imgSrcList.push(match[1]); // match[1] 是捕获的 src 值
                    }
                }
                return {
                    ...item,
                    author: {
                        ...item.author,
                        avatar: http.defaults.baseURL + item.author?.avatar,
                    },
                    content,
                    // 附件
                    attachments: item.attachments.map(i => ({
                        ...i,
                        url: i.url ? `${http.defaults.baseURL}` + i.url : null,
                        link: i.link ? `${http.defaults.baseURL}` + i.link : null,
                    })),
                }
            }),
        }
        if (pagination) {
            const { current, last, siblings } = pagination
            newData.pagination = {
                ...pagination,
                last: last || Math.max(siblings.at(-1)?.page, current),
            }
        }
        // redirect.php?tid=6379736(&goto=lastpost(#pid110991881)) 不参与缓存 
        // 最后一页和只有一页的情况下不参与缓存
        if (/^redirect\.php\?tid=\d*&goto=lastpost/.test(href) || !pagination || newData.pagination.current === newData.pagination.last) {
        } else {
            MMStore.cached[href] = result
        }
        console.log('imgSrcList', imgSrcList)
        return {
            ...newData,
            imgSrcList,
            anchor: href.split('#')[1],
            isCache
        }
    } catch (error) {
        console.log('getThreadPage', error);
        return Promise.reject(error)
    }
}

export const getPostPage = async (href) => {
    try {
        const res = await http.get(href, { selector: selectors.post })
        return {
            ...res.data,
            upload_limits: {
                size: +res.data.upload_limits[0].replace(/\D/g, ''),
                type: res.data.upload_limits[1].replace('可用扩展名: ', ''),
            },
        }
    } catch (error) {
        console.log('getPostPage', error);
        return Promise.reject(error)
    }
}

export const threadAction = async ({ action, href, formhash, subject, message }) => {
    if (action === 'reply') {
        await http.post(href, { formhash, subject, message })
    } else if (action === 'create') {
        await http.post(href, { formhash, delete: true })
    }
}

export const favoriteAction = async (type, href, formhash) => {
    try {
        if (type === 'add') {
            await http.get(href)
            favoriteAction('view', 'my.php?item=favorites&type=thread').then(threads => MMStore.favorites = threads)
        } else if (type === 'del') {
            const id = href.replace(/\D/g, '')
            const url = href.includes('fid') ? `my.php?item=favorites&type=forum` : `my.php?item=favorites&type=thread`
            await http.post(url, { formhash, 'delete%5B%5D': id, favsubmit: true })
            favoriteAction('view', 'my.php?item=favorites&type=thread').then(threads => MMStore.favorites = threads)
        } else if (type === 'view') {
            const res = await http.get(href, { selector: selectors.favorites })
            return res.data.threads
        }
    } catch (error) {
        console.log('favoriteAction', error);
    }
}

export const getMyPage = async () => {
    try {
        const res = await http.get('my.php', { selector: selectors.my })
        return res.data
    } catch (error) {
        console.log('getMyPage', error);
        return Promise.reject(error)
    }
}

export const getProfilePage = async () => {
    try {
        const res = await http.get(`memcp.php`, { selector: selectors.profile })
        return res.data
    } catch (error) {
        console.log('getProfilePage', error);
        return Promise.reject(error)
    }
}

export const getSearchPage = async () => {
    try {
        const res = await http.get(`search.php`, { selector: selectors.search })
        return res.data
    } catch (error) {
        console.log('getSearchPage', error);
        return Promise.reject(error)
    }
}

export const getSpacePage = async (uid) => {
    try {
        const res = await http.get(`space-uid-${uid}.html`, { selector: selectors.space })
        return res.data
    } catch (error) {
        console.log('getSpacePage', error);
        return Promise.reject(error)
    }
}

