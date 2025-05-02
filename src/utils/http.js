import axios from 'axios';
import iconv from 'iconv-lite';
import { storage, UTF8ToGBK, decodeHtmlEntity } from './index';
import temme from '../lib/temme';

/**
 * HTTP客户端封装
 * 基于axios实现，包含请求拦截器、响应拦截器和统一错误处理
 */
const selectedNode = storage.getString('selectedNode');

// 默认配置
const defaultConfig = {
    baseURL: selectedNode,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 30000, // 默认超时时间：30秒
    responseType: 'arraybuffer',
    withCredentials: true, // 跨域请求时发送cookie,
};
// 创建axios实例
const instance = axios.create(defaultConfig);
// 添加请求拦截器
instance.interceptors.request.use(config => {
    if ('POST,PUT,PATCH'.includes(config.method.toUpperCase()) && typeof config.data === 'object') {
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
        response.data = iconv.decode(new Uint8Array(response.data), "GBK");
        response.data = decodeHtmlEntity(response.data);
    }
    if (response.config.selector) {
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