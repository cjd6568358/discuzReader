import React, { useState, useEffect } from 'react';
import { LoadingProvider } from './src/components/Loading';
import { checkLogin, MMStore } from './src/utils/index';
import { createAppNavigation } from './src/router';
import { favoriteAction } from './src/utils/api';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(undefined);

  useEffect(() => {
    checkLogin().then(res => {
      setIsLoggedIn(res)
    }).catch(err => {
      console.log('登录状态检查失败:', err);
      setIsLoggedIn(false);
    })
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

  if (isLoggedIn === undefined) {
    return null
  }
  // 根据登录状态创建导航
  const Navigation = createAppNavigation({
    initialRouteName: isLoggedIn ? 'Home' : 'Login'
  });
  return <LoadingProvider><Navigation /></LoadingProvider>;
}

export default App;