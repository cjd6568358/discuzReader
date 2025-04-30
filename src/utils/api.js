
import http from './http';
import selectors from './selectors';

export const getIndexPage = async () => {
    try {
        const res = await http.get(`/bbs/index.php`, { selector: selectors.index })
        return {
            // 网站标题
            documentTitle: res.data.documentTitle,
            // 网站logo
            iconUrl: res.data.iconUrl,
            // 公告列表
            announcementList: res.data.announcementList,
            // 版块列表
            sectionList: res.data.sectionList,
            // 积分列表
            creditList: res.data.creditList,
            // 用户名
            username: res.data.username,
        }
    } catch (error) {
        console.log('getIndexPage', error);
    }
}

export const getPMPage = async () => {
    try {
        const res = await http.get(`/bbs/pm.php`, { selector: selectors.pm })
        return {
            // 消息列表
            pmList: res.data.pmList,
        }
    } catch (error) {
        console.log('getIndexPage', error);
    }
}