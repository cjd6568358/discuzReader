/**
 * HTTP客户端使用示例
 */

import http from './http';

// 设置全局配置
http.setConfig({
  baseURL: 'https://api.example.com',
  timeout: 15000, // 15秒超时
  headers: {
    'Accept-Language': 'zh-CN',
  },
});

// 添加请求拦截器 - 例如添加认证令牌
http.addRequestInterceptor((config) => {
  // 从本地存储获取token
  const token = localStorage.getItem('token');
  
  if (token) {
    // 添加Authorization头
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  
  return config;
});

// 添加响应拦截器 - 例如处理通用错误
http.addResponseInterceptor((response, config) => {
  // 处理特定的业务逻辑错误
  if (response.data && response.data.code !== 0) {
    const error = new Error(response.data.message || '请求失败');
    error.code = response.data.code;
    error.response = response;
    throw error;
  }
  
  return response;
});

// 使用示例

/**
 * 登录请求示例
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise} 登录结果
 */
export const login = async (username, password) => {
  try {
    const response = await http.post('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    console.error('登录失败:', error.message);
    throw error;
  }
};

/**
 * 获取用户信息示例
 * @param {string} userId - 用户ID
 * @returns {Promise} 用户信息
 */
export const getUserInfo = async (userId) => {
  try {
    const response = await http.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error.message);
    throw error;
  }
};

/**
 * 更新用户信息示例
 * @param {string} userId - 用户ID
 * @param {Object} userData - 用户数据
 * @returns {Promise} 更新结果
 */
export const updateUserInfo = async (userId, userData) => {
  try {
    const response = await http.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('更新用户信息失败:', error.message);
    throw error;
  }
};

/**
 * 上传文件示例
 * @param {File} file - 文件对象
 * @returns {Promise} 上传结果
 */
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // 注意：当使用FormData时，不要手动设置Content-Type，浏览器会自动设置正确的值
    const response = await http.post('/upload', formData, {
      headers: {
        'Content-Type': undefined, // 让浏览器自动设置
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('文件上传失败:', error.message);
    throw error;
  }
};