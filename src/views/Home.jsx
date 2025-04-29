import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList
} from 'react-native';
import TabBar from '../components/TabBar';
import Icon from 'react-native-vector-icons/FontAwesome';
import http from '../utils/http';
import temme from '../lib/temme';
import selectors from '../utils/selectors';

const IndexView = () => {
  const userAvatar = 'https://ai-public.mastergo.com/ai/img_res/332b35288bcbe0b2e07d4a33fad4d3a9.jpg';
  const announcement = '欢迎来到论坛社区！新用户注册即送 500 积分，参与互动赢好礼！';
  const [currentSection, setCurrentSection] = useState(1);

  const mainSections = [
    { id: 1, name: '综合讨论' },
    { id: 2, name: '技术交流' },
    { id: 3, name: '生活闲聊' },
    { id: 4, name: '求职招聘' },
    { id: 5, name: '资源分享' },
    { id: 6, name: '站务公告' }
  ];

  const forums = [
    {
      name: '程序开发',
      moderator: '技术大牛',
      todayPosts: '128 帖子',
      onlineUsers: '234 在线',
      lastPost: '10 分钟前',
      subforums: [
        { name: 'Web 前端', activity: 86 },
        { name: 'Java 开发', activity: 92 },
        { name: 'Python', activity: 78 },
        { name: '算法', activity: 45 },
        { name: '数据库', activity: 63 }
      ],
      icon: 'https://ai-public.mastergo.com/ai/img_res/826bb37382a631f40036f0efee1591a6.jpg'
    },
    {
      name: '职场交流',
      moderator: '职场导师',
      todayPosts: '89 帖子',
      onlineUsers: '156 在线',
      lastPost: '15 分钟前',
      subforums: [
        { name: '求职分享', activity: 56 },
        { name: '面试经验', activity: 48 },
        { name: '职场生存', activity: 72 },
        { name: '跳槽交流', activity: 89 }
      ],
      icon: 'https://ai-public.mastergo.com/ai/img_res/f574a41ba001cbd19b4d96f4eb6b5968.jpg'
    },
    {
      name: '生活分享',
      moderator: '生活家',
      todayPosts: '256 帖子',
      onlineUsers: '342 在线',
      lastPost: '5 分钟前',
      subforums: [
        { name: '美食天地', activity: 95 },
        { name: '旅行攻略', activity: 76 },
        { name: '运动健康', activity: 68 },
        { name: '生活妙招', activity: 82 }
      ],
      icon: 'https://ai-public.mastergo.com/ai/img_res/cfd5c725bbdc2f4c630d671d6ab832d0.jpg'
    }
  ];

  useEffect(() => {
    http.get(`/bbs/index.php`).then(res => {
      const t1 = Date.now();
      const data = temme(res.data, selectors.index);
      console.log(Date.now() - t1);
      console.log(data);
    }).catch(err => {
      console.log(err)
    });
  }, []) // 添加空依赖数组，防止无限循环调用

  const renderSectionItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => setCurrentSection(item.id)}
      style={[
        styles.sectionButton,
        currentSection === item.id ? styles.activeSectionButton : styles.inactiveSectionButton
      ]}
    >
      <Text
        style={[
          styles.sectionButtonText,
          currentSection === item.id ? styles.activeSectionText : styles.inactiveSectionText
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderSubforum = (subforum, index) => (
    <View key={index} style={styles.subforumTag}>
      <Text style={styles.subforumName}>{subforum.name}</Text>
      <Text style={styles.subforumActivity}>+{subforum.activity}</Text>
    </View>
  );

  const renderForumItem = ({ item, index }) => (
    <View key={index} style={styles.forumCard}>
      <View style={styles.forumHeader}>
        <Image source={{ uri: item.icon }} style={styles.forumIcon} />
        <View style={styles.forumInfo}>
          <Text style={styles.forumName}>{item.name}</Text>
          <Text style={styles.moderatorText}>版主：{item.moderator}</Text>

          <View style={styles.subforumContainer}>
            {item.subforums.map(renderSubforum)}
          </View>

          <View style={styles.forumStats}>
            <View style={styles.statItem}>
              <Icon name="comments" size={12} color="#6B7280" />
              <Text style={styles.statText}>{item.todayPosts}</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="users" size={12} color="#6B7280" />
              <Text style={styles.statText}>{item.onlineUsers}</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clock-o" size={12} color="#6B7280" />
              <Text style={styles.statText}>{item.lastPost}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 顶部导航栏 */}
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>论坛</Text>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: userAvatar }} style={styles.avatar} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 搜索栏 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              placeholder="搜索帖子、用户"
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* 公告栏 */}
        <View style={styles.announcementContainer}>
          <View style={styles.announcementBadge}>
            <Text style={styles.announcementBadgeText}>公告</Text>
          </View>
          <Text style={styles.announcementText}>{announcement}</Text>
        </View>

        {/* 主版块导航 */}
        <View style={styles.sectionsContainer}>
          <FlatList
            data={mainSections}
            renderItem={renderSectionItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionsList}
          />
        </View>

        {/* 子版块列表 */}
        <View style={styles.forumsContainer}>
          <FlatList
            data={forums}
            renderItem={renderForumItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      {/* 底部导航栏 */}
      <TabBar currentTab='Home' />
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
  navbar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#2563EB',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    height: 40,
    padding: 0,
  },
  announcementContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  announcementBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  announcementBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  announcementText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  sectionsContainer: {
    marginBottom: 16,
  },
  sectionsList: {
    paddingHorizontal: 16,
  },
  sectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  activeSectionButton: {
    backgroundColor: '#2563EB',
  },
  inactiveSectionButton: {
    backgroundColor: '#F3F4F6',
  },
  sectionButtonText: {
    fontSize: 14,
  },
  activeSectionText: {
    color: '#FFFFFF',
  },
  inactiveSectionText: {
    color: '#4B5563',
  },
  forumsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  forumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  forumIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  forumInfo: {
    marginLeft: 12,
    flex: 1,
  },
  forumName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  moderatorText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  subforumContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  subforumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  subforumName: {
    fontSize: 12,
    color: '#4B5563',
  },
  subforumActivity: {
    fontSize: 12,
    color: '#2563EB',
    marginLeft: 4,
  },
  forumStats: {
    flexDirection: 'row',
    marginTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  }
});

export default IndexView;
