import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Pressable, ToastAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';
import { useNavigation } from '@react-navigation/native';
import { useLoading } from '../components/Loading';
import { storage } from '../utils/index';
const PostScreen = ({ route }) => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [selectedNode] = useState(() => storage.getString('selectedNode'));
  const [cookies, setCookies] = useState({});
  const [userKeys] = useState(() => {
    let keyStr = storage.getString('userKeys');
    if (keyStr) {
      return {
        username: '',
        password: '',
        questionid: 0,
        answer: '',
        ...JSON.parse(keyStr)
      };
    }
    return {
      username: '',
      password: '',
      questionid: 0,
      answer: '',
    };
  });
  useEffect(() => {
    CookieManager.get(selectedNode).then((cookies) => {
      console.log('cookies', cookies);
      // Object.keys(cookies).forEach(key => {
      //   cookies[key].domain = selectedNode.replace(/https?:\/\//, '');
      //   cookies[key].path = '/';
      // })
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
          <Text style={styles.cancelText}>取消</Text>
        </Pressable>
        <Text style={styles.navTitle}>发表主题</Text>
        <Pressable style={styles.navButton} onPress={handlePublish}>
          <Text style={styles.publishText}>发布</Text>
        </Pressable>
      </View>

      {/* 主体内容区 */}
      {cookies.cdb3_auth?.value && <WebView
        source={{
          baseUrl: `${selectedNode}/bbs/`,
          uri: `${selectedNode}/bbs/${route.params.href}`,
          headers: {
            // 'Cookie': `cdb3_auth=T%2FwQvF2F2c%2FEi2CxtUPeq0GE0o4GCojU2Naj4%2FEJdk%2BFPYdNkoJWHVkofg5k9INBs%2BEDP0ROebFLIA`,
            'Referer': `${selectedNode}/bbs/forumdisplay.php?fid=${route.params.fid}&page=1`
          }
        }}
        style={styles.content}
        mixedContentMode="compatibility"
        allowFileAccess
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        injectedJavaScript={`
          // autologin
          const formEl = document.querySelector('.box.message form[name=login]')
          if (formEl) {
            formEl.querySelector('input[name=cookietime]').value=315360000;
            formEl.querySelector('input[name=username]').value='${userKeys.username}';
            formEl.querySelector('input[name=password]').value='${userKeys.password}';
            if (${userKeys.questionid} && '${userKeys.answer}') {
              formEl.querySelector('select[name=questionid]').value=${userKeys.questionid};
              formEl.querySelector('input[name=answer]').value='${userKeys.answer}';
            }
            '${userKeys.username}' && '${userKeys.password}' && formEl.querySelector('button[name=loginsubmit]').click();
          }
        `}
        // onLoadStart={() => showLoading()}
        // onLoadEnd={() => hideLoading()}
        userAgent='Mozilla/5.0 (Linux; Android 12; M2012K11AC Build/SKQ1.211002.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.134 Mobile Safari/537.36 MMWEBID/8989 MicroMessenger/8.0.32.20210'
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

