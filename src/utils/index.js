import { MMKV } from 'react-native-mmkv';
// import CookieManager from '@react-native-cookies/cookies';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Platform } from 'react-native';

export const storage = new MMKV();

/**
 * 检查用户是否已登录
 * 通过检查cookie中的cdb3_auth字段判断用户登录状态
 * Discuz论坛使用cdb3_auth cookie来标识用户登录状态
 * @returns {Promise<boolean>} 返回用户登录状态，true表示已登录，false表示未登录
 */
// export const checkLogin = async () => {
//   try {
//     // 论坛域名，请替换为实际的Discuz论坛域名
//     const discuzDomain = await AsyncStorage.getItem('discuzDomain');

//     // 根据平台获取cookie
//     if (Platform.OS === 'ios') {
//       // iOS平台需要指定useWebKit参数
//       const useWebKit = true;
//       const cookies = await CookieManager.getAll(useWebKit);

//       // iOS平台返回的是对象数组，需要遍历查找cdb3_auth
//       return Object.values(cookies).some(cookie =>
//         cookie.name === 'cdb3_auth' && cookie.value && cookie.value.length > 0
//       );
//     } else {
//       // Android平台直接获取指定域名的cookies
//       const cookies = await CookieManager.get(discuzDomain);

//       // Android平台返回的是键值对对象，直接检查cdb3_auth属性
//       return Boolean(cookies?.cdb3_auth?.value);
//     }
//   } catch (error) {
//     console.error('Cookie读取错误:', error);
//     return false;
//   }
// };