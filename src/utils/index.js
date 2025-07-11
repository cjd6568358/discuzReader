import { PermissionsAndroid, ToastAndroid } from 'react-native';
import CookieManager from '@react-native-cookies/cookies';
import { MMKV } from 'react-native-mmkv';
import RNFS from 'react-native-fs';
import iconv from 'iconv-lite'
// import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = new MMKV();
export const MMStore = {
    favorites: [],
    cached: {},
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

export const logout = async () => {
    try {
        await CookieManager.clearAll();
    } catch (error) {
        return false;
    }
}

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

const getFileNameFromUrl = (url) => {
    const regex = /\/([^\/?#]+)(?:[?#]|$)/; // 匹配最后一个斜杠后的字符串
    const match = url.match(regex);
    return match?.[1];
};

export const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0';

export const downloadFile = async (fromUrl, fileName = '') => {
    if (!fileName) {
        fileName = getFileNameFromUrl(fromUrl);
    }
    // 请求存储权限
    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
            title: '存储权限请求',
            message: '下载文件需要访问您的存储空间',
            buttonNeutral: '稍后询问',
            buttonNegative: '取消',
            buttonPositive: '确定'
        }
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('存储权限被拒绝');
        ToastAndroid.show('存储权限被拒绝', ToastAndroid.LONG);
        return Promise.reject('存储权限被拒绝');
    }
    // 使用公共下载目录，便于用户访问
    // 在Android上，DownloadDirectoryPath是公共下载目录
    const downloadPath = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
    try {
        const selectedNode = storage.getString('selectedNode');
        const cookies = await CookieManager.get(selectedNode);
        // 构建完整的文件路径
        const toFile = `${downloadPath}/DiscuzReader/${fileName}`;
        await RNFS.mkdir(`${downloadPath}/DiscuzReader`).catch(err => console.log('目录已存在或创建失败:', err));
        await RNFS.downloadFile({
            fromUrl,
            toFile,
            background: true,
            headers: {
                'Cookie': `cdb3_auth=${cookies.cdb3_auth.value};`,
                'User-Agent': userAgent,
            },
            begin: (res) => {
                console.log('文件大小:', res.contentLength);
            },
        })
        // 显示成功提示信息
        ToastAndroid.show(`文件 ${fileName} 已保存到下载目录`, ToastAndroid.LONG);
        // 如果是图片或PDF等文件，可以选择性地通知媒体库扫描该文件
        if (Platform.OS === 'android' && (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.pdf'))) {
            // 通知媒体库扫描新文件，使其在图库或文件管理器中可见
            await RNFS.scanFile(toFile).catch(err => console.log('媒体库扫描失败:', err));
        }
    } catch (error) {
        console.log('下载文件错误:', error);
        throw error; // 抛出错误以便调用者处理
    }
};

export const loadImageBase64 = async (uri) => {
    try {
        const response = await axios({
            url: uri,
            method: 'GET',
            responseType: 'blob', // 重要
        });
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(response.data);
        });
        return base64;
    } catch (error) {
        console.error('loadImageBase64:', error);
        throw error;
    }
};