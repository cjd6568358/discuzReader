import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getProfilePage } from '../utils/api';
import { logout, MMStore, storage } from '../utils/index';
import http from '../utils/http';

const Profile = () => {
  const navigation = useNavigation();
  const menuItems = [
    {
      title: '主题回复',
      icon: 'file-text-o',
      count: '128'
    },
    {
      title: '我的收藏',
      icon: 'star',
      count: MMStore.favorites.forums.length + MMStore.favorites.threads.length
    },
    {
      title: '我的浏览',
      icon: 'history',
      count: JSON.parse(storage.getString('history') || '[]').length + ''
    }
  ];
  const [pageData, setPageData] = useState({});
  useEffect(() => {
    getProfilePage().then(res => {
      setPageData(res);
    })
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F9FAFB" barStyle="dark-content" />
      <ScrollView style={styles.scrollView}>
        {/* 主要内容区 */}
        <View style={styles.contentContainer}>
          {/* 个人信息卡片 */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: `${http.defaults.baseURL}${pageData.avatar}` }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{pageData.username}</Text>
                <View style={styles.levelContainer}>
                  <Text style={styles.levelText}>
                    {pageData.level}
                  </Text>
                </View>
              </View>
              <View style={styles.statsContainer}>
                <View style={styles.statsGrid}>
                  {/* {statistics.map((stat, index) => (
                    <View key={index} style={styles.statItem}>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                  ))} */}
                </View>
                <Pressable style={styles.chevronContainer}>
                  <Icon name="chevron-right" size={16} color="#D1D5DB" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* 功能列表 */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                style={[styles.menuItem, index === menuItems.length - 1 ? styles.lastMenuItem : null]}
              >
                <Icon name={item.icon} size={20} color="#9CA3AF" style={styles.menuIcon} />
                <Text style={styles.menuTitle}>{item.title}</Text>
                <View style={styles.menuRight}>
                  {item.count && (
                    <Text style={styles.menuCount}>{item.count}</Text>
                  )}
                  <Icon name="chevron-right" size={16} color="#D1D5DB" />
                </View>
              </Pressable>
            ))}
          </View>

          {/* 设置和退出 */}
          <View style={styles.settingsContainer}>
            <Pressable style={styles.settingItem} onPress={() => {
              MMStore.cached = {}
            }}>
              <Icon name="trash" size={20} color="#9CA3AF" style={styles.menuIcon} />
              <Text style={styles.menuTitle}>清理缓存</Text>
              <Icon name="chevron-right" size={16} color="#D1D5DB" />
            </Pressable>
            <Pressable style={styles.settingItem} onPress={() => {
              try {
                logout().then(() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  })
                }).catch(err => {
                  console.log(err)
                })
              } catch (error) {
                console.log(error)
              }
            }}>
              <Icon name="sign-out" size={20} color="#9CA3AF" style={styles.menuIcon} />
              <Text style={styles.menuTitle}>退出登录</Text>
              <Icon name="chevron-right" size={16} color="#D1D5DB" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '500',
  },
  levelContainer: {
    marginTop: 4,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: {
    fontSize: 12,
    color: '#2563EB',
  },
  statsContainer: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 160,
  },
  statItem: {
    width: 40,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chevronContainer: {
    marginLeft: 0,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
  },
  menuTitle: {
    marginLeft: 12,
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuCount: {
    marginRight: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
});

export default Profile;
