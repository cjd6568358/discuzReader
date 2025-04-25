/**
 * HTTP客户端封装
 * 基于fetch API实现，包含请求拦截器、响应拦截器和统一错误处理
 */

// 默认配置
const defaultConfig = {
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 默认超时时间：30秒
};

// 拦截器
const interceptors = {
  request: [],
  response: [],
};

/**
 * 超时处理函数
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise} 超时Promise
 */
const timeoutPromise = (timeout) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`请求超时，超过 ${timeout}ms`));
    }, timeout);
  });
};

/**
 * 合并配置
 * @param {Object} config - 用户配置
 * @returns {Object} 合并后的配置
 */
const mergeConfig = (config) => {
  const mergedConfig = { ...defaultConfig, ...config };
  
  // 合并headers
  mergedConfig.headers = {
    ...defaultConfig.headers,
    ...config.headers,
  };
  
  return mergedConfig;
};

/**
 * 处理请求URL
 * @param {string} url - 请求URL
 * @param {Object} config - 请求配置
 * @returns {string} 完整URL
 */
const processURL = (url, config) => {
  // 如果是完整URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 拼接baseURL和url
  const baseURL = config.baseURL || '';
  return `${baseURL}${url.startsWith('/') ? url : `/${url}`}`;
};

/**
 * 执行请求拦截器
 * @param {Object} config - 请求配置
 * @returns {Object} 处理后的配置
 */
const runRequestInterceptors = async (config) => {
  let currentConfig = { ...config };
  
  for (const interceptor of interceptors.request) {
    try {
      currentConfig = await interceptor(currentConfig);
    } catch (error) {
      throw error;
    }
  }
  
  return currentConfig;
};

/**
 * 执行响应拦截器
 * @param {Object} response - 响应对象
 * @param {Object} config - 请求配置
 * @returns {Object} 处理后的响应
 */
const runResponseInterceptors = async (response, config) => {
  let currentResponse = response;
  
  for (const interceptor of interceptors.response) {
    try {
      currentResponse = await interceptor(currentResponse, config);
    } catch (error) {
      throw error;
    }
  }
  
  return currentResponse;
};

/**
 * 处理响应
 * @param {Response} response - fetch响应对象
 * @returns {Promise} 处理后的响应数据
 */
const processResponse = async (response) => {
  const contentType = response.headers.get('Content-Type') || '';
  
  if (contentType.includes('application/json')) {
    return await response.json();
  } else if (contentType.includes('text/')) {
    return await response.text();
  } else if (contentType.includes('form')) {
    return await response.formData();
  } else if (/^(video|audio|\/application\/octet-stream)/.test(contentType)) {
    return await response.blob();
  } else {
    return await response.text();
  }
};

/**
 * 错误处理函数
 * @param {Error} error - 错误对象
 * @param {Object} config - 请求配置
 * @throws {Error} 处理后的错误
 */
const handleError = (error, config) => {
  // 网络错误
  if (error.message === 'Network request failed' || error.name === 'TypeError') {
    error.message = '网络连接失败，请检查您的网络';
    error.code = 'NETWORK_ERROR';
  }
  
  // 超时错误
  if (error.message && error.message.includes('请求超时')) {
    error.code = 'TIMEOUT_ERROR';
  }
  
  // 取消请求
  if (error.name === 'AbortError') {
    error.message = '请求已取消';
    error.code = 'ABORT_ERROR';
  }
  
  // 添加请求信息到错误对象
  error.config = config;
  error.request = true;
  
  throw error;
};

/**
 * 发送请求
 * @param {string} url - 请求URL
 * @param {Object} config - 请求配置
 * @returns {Promise} 响应结果
 */
const request = async (url, config = {}) => {
  // 合并配置
  const mergedConfig = mergeConfig(config);
  
  try {
    // 执行请求拦截器
    const processedConfig = await runRequestInterceptors(mergedConfig);
    
    // 处理URL
    const fullURL = processURL(url, processedConfig);
    
    // 创建AbortController用于超时控制
    const controller = new AbortController();
    processedConfig.signal = controller.signal;
    
    // 设置超时
    const fetchPromise = fetch(fullURL, processedConfig);
    const timeoutHandler = processedConfig.timeout ? timeoutPromise(processedConfig.timeout) : null;
    
    // 发送请求
    const response = await Promise.race([fetchPromise, timeoutHandler].filter(Boolean));
    
    // 如果请求成功但状态码不是2xx，抛出错误
    if (!response.ok) {
      const error = new Error(`请求失败，状态码: ${response.status}`);
      error.response = response;
      error.status = response.status;
      throw error;
    }
    
    // 处理响应数据
    const data = await processResponse(response);
    
    // 构建响应对象
    const responseObj = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config: processedConfig,
    };
    
    // 执行响应拦截器
    return await runResponseInterceptors(responseObj, processedConfig);
  } catch (error) {
    return handleError(error, mergedConfig);
  }
};

/**
 * HTTP方法封装
 */
const http = {
  /**
   * GET请求
   * @param {string} url - 请求URL
   * @param {Object} config - 请求配置
   * @returns {Promise} 响应结果
   */
  get: (url, config = {}) => {
    return request(url, { ...config, method: 'GET' });
  },
  
  /**
   * POST请求
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} config - 请求配置
   * @returns {Promise} 响应结果
   */
  post: (url, data, config = {}) => {
    return request(url, { ...config, method: 'POST', body: JSON.stringify(data) });
  },
  
  /**
   * PUT请求
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} config - 请求配置
   * @returns {Promise} 响应结果
   */
  put: (url, data, config = {}) => {
    return request(url, { ...config, method: 'PUT', body: JSON.stringify(data) });
  },
  
  /**
   * DELETE请求
   * @param {string} url - 请求URL
   * @param {Object} config - 请求配置
   * @returns {Promise} 响应结果
   */
  delete: (url, config = {}) => {
    return request(url, { ...config, method: 'DELETE' });
  },
  
  /**
   * PATCH请求
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} config - 请求配置
   * @returns {Promise} 响应结果
   */
  patch: (url, data, config = {}) => {
    return request(url, { ...config, method: 'PATCH', body: JSON.stringify(data) });
  },
  
  /**
   * 添加请求拦截器
   * @param {Function} interceptor - 拦截器函数
   * @returns {Function} 移除拦截器的函数
   */
  addRequestInterceptor: (interceptor) => {
    interceptors.request.push(interceptor);
    return () => {
      const index = interceptors.request.indexOf(interceptor);
      if (index !== -1) {
        interceptors.request.splice(index, 1);
      }
    };
  },
  
  /**
   * 添加响应拦截器
   * @param {Function} interceptor - 拦截器函数
   * @returns {Function} 移除拦截器的函数
   */
  addResponseInterceptor: (interceptor) => {
    interceptors.response.push(interceptor);
    return () => {
      const index = interceptors.response.indexOf(interceptor);
      if (index !== -1) {
        interceptors.response.splice(index, 1);
      }
    };
  },
  
  /**
   * 设置默认配置
   * @param {Object} config - 配置对象
   */
  setConfig: (config) => {
    Object.assign(defaultConfig, config);
  },
};

export default http;