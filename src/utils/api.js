import http from './http';
import selectors from './selectors';
import { MMStore, storage } from './index';

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
    }
}

export const getPMPage = async () => {
    try {
        const res = await http.get(`pm.php`, { selector: selectors.pm })
        return {
            // 消息列表
            pmList: res.data.pmList,
        }
    } catch (error) {
        console.log('getPMPage', error);
    }
}

export const messageAction = async ({ action = 'view', id, data }) => {
    try {
        if (action === 'view') {
            const res = await http.get(`pm.php?action=${action}&folder=inbox&pmid=${id}&inajax=1`)
            return res.data.replace(/.*<!\[CDATA\[\s*<br\s*\/?>\s*(.*?)<div class="postactions".*/s, '$1')
        } else if (action === 'delete') {
            if (Array.isArray(id)) {
                const res = await http.post(`pm.php?action=${action}&folder=inbox`, `formhash=24cbfa84&${id.map(key => `delete%5B%5D=${key}`).join('&')}&pmsend=true`)
            } else {
                const res = await http.get(`pm.php?action=${action}&folder=inbox&pmid=${id}`)
            }
        } else if (action === 'markunread') {
            const res = await http.get(`pm.php?action=${action}&folder=inbox&pmid=${id}`)
        } else if (action === 'send') {
            const res = await http.post(`pm.php?action=send&inajax=1`, data)
        }

    } catch (error) {
        console.log('messageAction', error);
    }
}

export const getForumPage = async (href) => {
    try {
        const res = await http.get(href, { selector: selectors.forum })
        const { title, breadcrumb, pagination } = res.data
        const newData = {
            ...res.data,
            title: title.replace(title_regex, '$1'),
            breadcrumb: breadcrumb.map(item => ({
                ...item,
                name: item.name.replace(title_regex, '$1'),
            })),
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
    }
}

export const getThreadPage = async (href) => {
    // thread-6379736-1-1.html(#pid110991881) 不需要解析
    // /thread-\d*-\d*-\d*.html/.test(href)
    if (/viewthread\.php\?tid=(\d+)(?:&page=(\d+))?(?:#(\d+))?/.test(href)) {
        // viewthread.php?tid=6369158(&page=1(#pid110991881))
        const [, tid, page = 1, anchor] = url.match(/viewthread\.php\?tid=(\d+)(?:&page=(\d+))?(?:#(\d+))?/)
        href = `thread-${tid}-${page}-1.html${anchor ? `#${anchor}` : ''}}`
    }
    if (MMStore.cached[href]) {
        return {
            ...MMStore.cached[href],
            cached: true,
            anchor: href.split('#')[1]
        }
    }
    try {
        const res = await http.get(href, { selector: selectors.thread })
        const { title, breadcrumb, posts, pagination } = res.data
        const selectedNode = storage.getString('selectedNode');
        const newData = {
            ...res.data,
            title: title.replace(title_regex, '$1'),
            breadcrumb: breadcrumb.map(item => ({
                ...item,
                name: item.name.replace(title_regex, '$1'),
            })),
            posts: posts.map(item => {
                return {
                    ...item,
                    author: {
                        ...item.author,
                        avatar: `${selectedNode}/bbs/` + item.author.avatar,
                    },
                    content: item.content
                        .replace(/[\t]/g, ``)
                        .replace(/(\S)(<br>)(\S)/g, "$1$3")
                        .replace(/="attachment/g, `="${selectedNode}/bbs/attachment`)
                        .replace(/="images/g, `="${selectedNode}/bbs/images`)
                        .replace(/="http:\/\/(.*)\/bbs\//g, `="${selectedNode}/bbs/`),
                    // 附件
                    attachments: item.attachments.map(i => ({
                        ...i,
                        url: i.url ? `${selectedNode}/bbs/` + i.url : null,
                        link: i.link ? `${selectedNode}/bbs/` + i.link : null,
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
        // 第一页和最后一页不参与缓存
        if (!/^redirect\.php\?tid=\d*&goto=lastpost/.test(href) || !pagination || newData.pagination.current === newData.pagination.last) {
            MMStore.cached[href] = newData
        }
        return {
            ...newData,
            anchor: href.split('#')[1]
        }
    } catch (error) {
        console.log('getForumPage', error);
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
        } else if (type === 'del') {
            const id = href.replace(/\D/g, '')
            const url = href.includes('fid') ? `my.php?item=favorites&type=forum` : `my.php?item=favorites&type=thread`
            await http.post(url, { formhash, 'delete%5B%5D': id, favsubmit: true })
        } else if (type === 'view') {
            const res = await http.get(href, { selector: selectors.favorites })
            return res.data.ids
        }
    } catch (error) {
        console.log('favoriteAction', error);
    }
}