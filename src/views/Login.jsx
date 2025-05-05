import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
  StatusBar,
  ToastAndroid
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import http from '../utils/http';
import { storage } from '../utils/index'

const LoginView = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('cjd610630890');
  const [password, setPassword] = useState('cjd110109');
  const [securityAnswer, setSecurityAnswer] = useState('3,建湖');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);


  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    if (!storage.getString('selectedNode')) {
      ToastAndroid.show('请先配置节点', ToastAndroid.SHORT);
      return
    }
    const [questionid, answer] = securityAnswer.split(",");
    http.get('logging.php?action=login', { selector: selectors.login }).then(async res => {
      const formhash = res.data.formhash;
      try {

        let formData = {
          cookietime: "315360000",
          loginfield: "username",
          referer: 'index.php',
          loginsubmit: true,
          formhash,
          questionid,
          answer,
          username,
          password,
        };

        if (!questionid || !answer) {
          delete formData.questionid;
          delete formData.answer;
        }
        const res = await http.post(`logging.php?action=login`, formData);
        if (res.data.includes(`欢迎您回来，${username}。现在将转入登录前页面。`)) {
          ToastAndroid.show('登录成功', ToastAndroid.SHORT);
        }
        // 导航到首页
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } catch (error) {
        console.error('Login failed:', error);
        // 这里可以添加错误提示逻辑
        ToastAndroid.show('登录失败', ToastAndroid.SHORT);
      }
    });
  };

  const handleSettings = () => {
    console.log('Navigating to Nodes screen');
    navigation.navigate('Nodes');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <Pressable
        onPress={handleSettings}
        style={styles.settingsButton}
        activeOpacity={0.7}
      >
        <Icon name="cog" size={24} color="#9CA3AF" />
      </Pressable>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部Logo区域 */}
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image source={require('../../assets/images/ic_launcher.png')} style={styles.logo} />
            <View style={styles.logoOverlay} />
          </View>
          <Text style={styles.appTitle}>Discuz 阅读器</Text>
        </View>

        {/* 登录表单 */}
        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Icon name="user" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="请输入用户名"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Icon name="lock" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="请输入密码"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
            <Pressable onPress={togglePassword} style={styles.eyeIcon}>
              <Icon name={showPassword ? "eye" : "eye-slash"} size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          <View style={styles.inputWrapper}>
            <Icon name="shield" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={securityAnswer}
              onChangeText={setSecurityAnswer}
              placeholder="如果启用了高级安全策略，请输入问题答案"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.rememberContainer}>
            <Switch
              value={rememberPassword}
              onValueChange={setRememberPassword}
              trackColor={{ false: "#E5E7EB", true: "#93C5FD" }}
              thumbColor={rememberPassword ? "#2563EB" : "#F9FAFB"}
            />
            <Text style={styles.rememberText}>记住密码</Text>
          </View>

          <Pressable
            onPress={handleLogin}
            style={styles.loginButton}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>登 录</Text>
          </Pressable>

          <View style={styles.linksContainer}>
            <Text style={styles.forgotPasswordText}>忘记密码？</Text>
            <Text style={styles.registerText}>注册新账号</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoContainer: {
    paddingTop: 80,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(219, 234, 254, 0.1)',
  },
  appTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '500',
    color: '#3B82F6',
  },
  formContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: '#1F2937',
  },
  eyeIcon: {
    padding: 8,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  loginButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 16,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4B5563',
  },
  registerText: {
    fontSize: 14,
    color: '#2563EB',
  },
  settingIcon: {
    position: 'absolute',
    top: 12,
    right: 20,
  },
  settingsButton: {
    position: 'absolute',
    top: 24,
    right: 12,
    padding: 12,
    zIndex: 10,
  },
});

export default LoginView;
