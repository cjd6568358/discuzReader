import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HeaderButtonsProvider } from 'react-navigation-header-buttons/HeaderButtonsProvider';
import { RootStack } from './src/router';
import { LoadingProvider } from './src/components/Loading';
import { checkLogin, MMStore } from './src/utils/index';
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
      favoriteAction('view', 'my.php?item=favorites&type=thread').then(threads => MMStore.favorites = threads).catch(err => {
        console.log('初始化收藏数据失败', err)
      })
    }
  }, [isLoggedIn]);

  if (isLoggedIn === undefined) {
    return null
  }

  return <NavigationContainer>
    <SafeAreaProvider>
      <HeaderButtonsProvider stackType='native'>
        <LoadingProvider>
          <RootStack initialRouteName={isLoggedIn ? 'Home' : 'Login'} />
        </LoadingProvider>
      </HeaderButtonsProvider>
    </SafeAreaProvider>
  </NavigationContainer>;
}

export default App;