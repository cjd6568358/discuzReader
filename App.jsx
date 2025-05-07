/**
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { LoadingProvider } from './src/components/Loading';
import { checkLogin, MMStore } from './src/utils/index';
import { createAppNavigation } from './src/router';
import { favoriteAction } from './src/utils/api';


const App = () => {
  const [loading, setLoading] = useState(true);
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
        setLoading(false);
      }
    };

    checkUserLogin();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      // 初始化收藏数据
      Promise.all([
        favoriteAction('view', 'my.php?item=favorites&type=thread'),
        favoriteAction('view', 'my.php?item=favorites&type=forum')
      ]).then(([thread, forum]) => {
        MMStore.favorites.thread = thread
        MMStore.favorites.forums = forum
      }).catch(err => {
        console.log('初始化收藏数据', err)
      })
    }
  }, [isLoggedIn]);

  // 根据登录状态创建导航
  const Navigation = createAppNavigation({
    initialRouteName: isLoggedIn ? 'Home' : 'Login'
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return <LoadingProvider><Navigation /></LoadingProvider>;
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