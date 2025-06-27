import axios from 'axios';
import iconv from 'iconv-lite';
import { ToastAndroid } from 'react-native';
import { storage, userAgent, UTF8ToGBK, decodeHtmlEntity, logout } from './index';
import temme from '../lib/temme';

/**
 * HTTP客户端封装
 * 基于axios实现，包含请求拦截器、响应拦截器和统一错误处理
 */

// 默认配置
const defaultConfig = {
    baseURL: storage.getString('selectedNode') + '/bbs/',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
    },
    timeout: 6000, // 默认超时时间：4秒
    responseType: 'arraybuffer',
    withCredentials: true, // 跨域请求时发送cookie,
};
// 创建axios实例
const instance = axios.create(defaultConfig);
// 添加请求拦截器
instance.interceptors.request.use(config => {
    if ('POST,PUT,PATCH'.includes(config.method.toUpperCase()) && !config.skipGBK) {
        config.data = UTF8ToGBK(decodeURIComponent(new URLSearchParams(config.data).toString()));
    }
    return config;
}, error => {
    // 对请求错误做些什么
    return Promise.reject(error);
});

// 添加响应拦截器
instance.interceptors.response.use(response => {
    if (response.config.responseType === 'arraybuffer') {
        response.data = decodeHtmlEntity(iconv.decode(new Uint8Array(response.data), "GBK"));
    }
    if (response.headers['content-Length'] < 500) {
        const errorStack = response.data
            // 合并 <br> 和 <br/> 的处理，并去掉多余空格
            .replace(/<br\s*\/?>\s*/g, '<br/>')
            // 将连续的 <br/> 替换为一个
            .replace(/(<br\/>){2}/g, '<br/>')
            // 移除 <b> 标签
            .replace(/<\/?b>/g, '')
            // 按 <br/> 分割
            .split('<br/>')
        if (errorStack) {
            ToastAndroid.show(errorStack[0], ToastAndroid.SHORT);
        }
        throw new Error(errorStack);
    } else if (response.config.url !== 'logging.php?action=login' && response.data.includes(`<a href="logging.php?action=login">登录</a>`)) {
        logout()
        return Promise.reject('redirect login');
    } else if (response.config.selector) {
        const t1 = Date.now();
        response.data = temme(response.data, response.config.selector);
        console.log('temme time:', Date.now() - t1);
    }
    // 对响应数据做点什么
    return response;
}, error => {
    // 对响应错误做点什么
    return Promise.reject(error);
});
export default instance;