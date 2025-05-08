import { MMKV } from 'react-native-mmkv';
import iconv from 'iconv-lite'
import CookieManager from '@react-native-cookies/cookies';
// import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = new MMKV();
export const MMStore = {
    'favorites': {
        forums: [],
        threads: [],
    },
    'cached': {},
};
/**
 * 检查用户是否已登录
 * 通过检查cookie中的cdb3_auth字段判断用户登录状态
 * Discuz论坛使用cdb3_auth cookie来标识用户登录状态
 * @returns {Promise<boolean>} 返回用户登录状态，true表示已登录，false表示未登录
 */
export const checkLogin = async () => {
    try {
        const selectedNode = storage.getString('selectedNode');
        if (!selectedNode) {
            return false;
        }
        // Android平台直接获取指定域名的cookies
        const cookies = await CookieManager.get(selectedNode);

        // Android平台返回的是键值对对象，直接检查cdb3_auth属性
        return Boolean(cookies?.cdb3_auth?.value);
    } catch (error) {
        console.error('Cookie读取错误:', error);
        return false;
    }
};

export const UTF8ToGBK = (str) => {
    let from = iconv.encode(str, 'GBK');
    var rt = "";
    for (var i = 0; i < from.length; i++) {
        var c = from.readUInt8(i);
        if (c > 127) {
            i++;
            var c2 = from.readUInt8(i);
            rt +=
                "%" +
                c.toString(16).toUpperCase() +
                "%" +
                c2.toString(16).toUpperCase();
        } else {
            rt += String.fromCharCode(c);
        }
    }
    return rt;
};

export const decodeHtmlEntity = (html) => {
    if (!html) {
        return '';
    }
    return html.replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "\'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/, function (match, dec) {
            return String.fromCharCode(+dec);
        })
}