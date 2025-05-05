
import http from './http';
import selectors from './selectors';

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

export const postMessageAction = async (action = 'view', id) => {
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
        } else if (action === 'reply') {
            const res = await http.get(`pm.php?action=send&do=${action}&pmid=${id}`)
        }

    } catch (error) {
        console.log('getPostMessageContent', error);
    }
}

export const getForumPage = async (href) => {
    try {
        const res = await http.get(href, { selector: selectors.forum })
        return res.data
    } catch (error) {
        console.log('getForumPage', error);
    }
}

export const favoriteAction = async (type, href) => {
    try {
        if (type === 'add') {
            await http.get(href)
        } else if (type === 'delete') {
            const id = href.split('-')[1]
            if (href.includes('forum-')) {
                await http.post(`my.php?item=favorites&type=forum`, `formhash=24cbfa84&delete%5B%5D=${id}&favsubmit=true`)
            } else {
                await http.post(`my.php?item=favorites&type=thread`, `formhash=24cbfa84&delete%5B%5D=${id}&favsubmit=true`)
            }
        } else if (type === 'view') {
            const res = await http.get(href, { selector: selectors.favorites })
            return res.data
        }
    } catch (error) {
        console.log('favoriteAction', error);
    }
}