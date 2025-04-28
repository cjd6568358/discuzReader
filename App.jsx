/**
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { checkLogin } from './src/utils/index';
import { createAppNavigation } from './src/router';


const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUserLogin = async () => {
      try {
        // 检查用户登录状态
        const loginStatus = await checkLogin();
        setIsLoggedIn(loginStatus);
      } catch (error) {
        console.error('登录状态检查失败:', error);
        setIsLoggedIn(false);
      } finally {
        // 无论成功失败，都结束加载状态
        setIsLoading(false);
      }
    };

    checkUserLogin();
  }, []);

  // 根据登录状态创建导航
  const Navigation = createAppNavigation({
    initialRouteName: isLoggedIn ? 'Home' : 'Login'
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return <Navigation />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  }
});

export default App;