import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';
import { useNavigation } from '@react-navigation/native';
import { useLoading } from '../components/Loading';
import { storage, userAgent } from '../utils/index';

const PostScreen = ({ route }) => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [selectedNode] = useState(() => storage.getString('selectedNode'));
  const [cookies, setCookies] = useState({});

  useEffect(() => {
    CookieManager.get(selectedNode).then((cookies) => {
      console.log('cookies', cookies);
      setCookies(cookies);
    });
  }, [selectedNode]);

  const handleCancel = () => {
    // 处理取消操作
    navigation.goBack();
  };
  const handlePublish = () => {

  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 顶部导航栏 */}
      <View style={styles.navbar}>
        <Pressable style={styles.navButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>返回</Text>
        </Pressable>
        <Text style={styles.navTitle}>发表主题</Text>
        <Pressable style={styles.navButton} onPress={handlePublish}>
          <Text style={styles.publishText}></Text>
        </Pressable>
      </View>

      {/* 主体内容区 */}
      {cookies.cdb3_auth?.value && <WebView
        source={{
          baseUrl: `${selectedNode}/bbs/`,
          uri: `${selectedNode}/bbs/${route.params.href}`,
          headers: {
            'Cookie': `cdb3_auth=${cookies.cdb3_auth.value};`,
            'Referer': `${selectedNode}/bbs/forumdisplay.php?fid=${route.params.fid}&page=1`
          }
        }}
        style={styles.content}
        mixedContentMode="compatibility"
        allowFileAccess
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        // onLoadStart={() => showLoading()}
        // onLoadEnd={() => hideLoading()}
        userAgent={userAgent}
      />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
  },
  navButton: {
    padding: 8,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  publishText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default PostScreen;

