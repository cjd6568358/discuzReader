import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useLoading } from '../components/Loading';
import { getForumPage } from '../utils/api'

const ForumView = ({ route }) => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [pageData, setPageData] = useState(null);
  const [activeTab, setActiveTab] = useState('forum');
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setIsScrolled(scrollY > 0);
  };

  useEffect(() => {
    showLoading()
    getForumPage(route.params.href).then(data => {
      console.log(data);
      setPageData(data);
      navigation.setOptions({
        headerTitle: () => <View style={styles.breadcrumb}>
          {
            data?.breadcrumb.slice(1).map((item, index) =>
              <>
                <Pressable>
                  <Text style={styles.breadcrumbText}>{item.name}</Text>
                </Pressable>
                <Icon name="chevron-right" size={12} color="#9CA3AF" style={styles.breadcrumbIcon} />
              </>
            )
          }
          <Text style={styles.breadcrumbActiveText}>{data?.title}</Text>
        </View>,
        headerRight: () => (
          <View style={styles.navbarRight}>
            <Pressable style={styles.starButton}>
              <Icon name="star-o" size={16} color="#9CA3AF" />
            </Pressable>
            <Pressable style={styles.avatarButton}>
              <Image
                source={{ uri: 'https://ai-public.mastergo.com/ai/img_res/ae4cca99cabea5edbc86467d60714c68.jpg' }}
                style={styles.navAvatar}
              />
            </Pressable>
          </View>
        ),
      })
    }).catch(error => {
      console.log(error);
    }).finally(() => {
      hideLoading();
    });
  }, [])

  const tabs = [
    { id: 'sticky', name: '固定主题' },
    { id: 'important', name: '重要主题' },
    { id: 'recommend', name: '推荐主题' },
    { id: 'forum', name: '本板块主题' },
  ];

  const subForums = [
    { id: 1, name: '攻略心得' },
    { id: 2, name: '组队交友' },
    { id: 3, name: '资源分享' },
    { id: 4, name: '问题反馈' }
  ];

  const pinnedTopics = [
    {
      id: 1,
      title: '【公告】发帖规范及板块管理规则',
      author: '版主小助手',
      authorAvatar: 'https://ai-public.mastergo.com/ai/img_res/ab1e4c1cabd038f48cf5ce350c327906.jpg',
      date: '2024-01-15',
      replies: 2890,
    },
    {
      id: 2,
      title: '【置顶】新手玩家必读攻略合集',
      author: '游戏管理员',
      authorAvatar: 'https://ai-public.mastergo.com/ai/img_res/5add537ac4f4371c019121c9ab3270fa.jpg',
      date: '2024-01-14',
      replies: 1567,
    }
  ];

  const topics = [
    {
      id: 1,
      type: '精华',
      title: '《守望先锋2》第8赛季最强英雄选择指南',
      author: '电竞解说张宇',
      authorAvatar: 'https://ai-public.mastergo.com/ai/img_res/5aaacb0e8c103a97c5b0a6e733666af6.jpg',
      date: '2024-01-15',
      views: 3421,
      replies: 89,
    },
    {
      id: 2,
      type: '讨论',
      title: '新版本平衡性改动详细分析',
      author: '资深玩家李明',
      authorAvatar: 'https://ai-public.mastergo.com/ai/img_res/41c7efc309f37fb3120c64f0ffd01050.jpg',
      date: '2024-01-15',
      views: 2156,
      replies: 67,
    },
    {
      id: 3,
      type: '分享',
      title: '团队配合技巧分享：如何提升胜率',
      author: '战队队长王强',
      authorAvatar: 'https://ai-public.mastergo.com/ai/img_res/68de63458729d7f0df26947c12a0e6d3.jpg',
      date: '2024-01-15',
      views: 1890,
      replies: 45,
    },
    {
      id: 4,
      type: '讨论',
      title: '关于新英雄平衡性的讨论',
      author: '游戏设计师陈静',
      authorAvatar: 'https://ai-public.mastergo.com/ai/img_res/4ddb65285c2535f4dc880468708fc8d7.jpg',
      date: '2024-01-15',
      views: 1567,
      replies: 78,
    },
    {
      id: 5,
      type: '建议',
      title: '游戏优化建议收集帖',
      author: '资深测试工程师',
      authorAvatar: 'https://ai-public.mastergo.com/ai/img_res/97dcc53db0b91e09bfc9cadccc8f8347.jpg',
      date: '2024-01-15',
      views: 987,
      replies: 34,
    }
  ];

  const renderSubForums = () => (
    <View style={styles.subForumsGrid}>
      {subForums.map(forum => (
        <View key={forum.id} style={styles.subForumItem}>
          <Pressable style={styles.subForumButton}>
            <Text style={styles.subForumText}>{forum.name}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );

  const renderTagButtons = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScrollView}>
      <View style={styles.tagsContainer}>
        <Pressable style={[styles.tagButton, styles.blueTag]}>
          <Text style={styles.blueTagText}>#最新</Text>
        </Pressable>
        <Pressable style={[styles.tagButton, styles.greenTag]}>
          <Text style={styles.greenTagText}>#热门</Text>
        </Pressable>
        <Pressable style={[styles.tagButton, styles.purpleTag]}>
          <Text style={styles.purpleTagText}>#攻略</Text>
        </Pressable>
        <Pressable style={[styles.tagButton, styles.yellowTag]}>
          <Text style={styles.yellowTagText}>#视频</Text>
        </Pressable>
        <Pressable style={[styles.tagButton, styles.redTag]}>
          <Text style={styles.redTagText}>#赛事</Text>
        </Pressable>
        <Pressable style={[styles.tagButton, styles.pinkTag]}>
          <Text style={styles.pinkTagText}>#同人</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderTabButtons = () => (
    <View style={[styles.tabsContainer, isScrolled && styles.tabsContainerShadow]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScrollView}>
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            style={styles.tabButton}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderTopicContent = () => {
    if (activeTab === 'sticky') {
      return (
        <View>
          {pinnedTopics.map(topic => (
            <Pressable key={topic.id} style={styles.stickyTopicCard}>
              <View style={styles.topicHeader}>
                <View style={styles.stickyBadge}>
                  <Text style={styles.stickyBadgeText}>固定</Text>
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
              </View>
              <View style={styles.topicFooter}>
                <Image source={{ uri: topic.authorAvatar }} style={styles.authorAvatar} />
                <Text style={styles.authorNameBlue}>{topic.author}</Text>
                <Text style={styles.dateText}>{topic.date}</Text>
                <View style={styles.statsContainer}>
                  <Icon name="comment-o" size={12} color="#6B7280" />
                  <Text style={styles.statsText}>{topic.replies}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      );
    } else if (activeTab === 'important') {
      return (
        <View>
          {topics.filter(t => t.type === '精华').map(topic => (
            <Pressable key={topic.id} style={styles.importantTopicCard}>
              <View style={styles.topicHeader}>
                <View style={styles.importantBadge}>
                  <Text style={styles.importantBadgeText}>重要</Text>
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
              </View>
              <View style={styles.topicFooter}>
                <Image source={{ uri: topic.authorAvatar }} style={styles.authorAvatar} />
                <Text style={styles.authorNameYellow}>{topic.author}</Text>
                <Text style={styles.dateText}>{topic.date}</Text>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Icon name="eye" size={12} color="#6B7280" />
                    <Text style={styles.statsText}>{topic.views}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Icon name="comment-o" size={12} color="#6B7280" />
                    <Text style={styles.statsText}>{topic.replies}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      );
    } else if (activeTab === 'recommend') {
      return (
        <View>
          {topics.filter(t => t.type === '分享').map(topic => (
            <Pressable key={topic.id} style={styles.recommendTopicCard}>
              <View style={styles.topicHeader}>
                <View style={styles.recommendBadge}>
                  <Text style={styles.recommendBadgeText}>推荐</Text>
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
              </View>
              <View style={styles.topicFooter}>
                <Image source={{ uri: topic.authorAvatar }} style={styles.authorAvatar} />
                <Text style={styles.authorNameGreen}>{topic.author}</Text>
                <Text style={styles.dateText}>{topic.date}</Text>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Icon name="eye" size={12} color="#6B7280" />
                    <Text style={styles.statsText}>{topic.views}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Icon name="comment-o" size={12} color="#6B7280" />
                    <Text style={styles.statsText}>{topic.replies}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      );
    } else {
      return (
        <View>
          {topics.filter(t => t.type === '讨论' || t.type === '建议').map(topic => (
            <Pressable key={topic.id} style={styles.forumTopicCard}>
              <View style={styles.topicHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{topic.type}</Text>
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
              </View>
              <View style={styles.topicFooter}>
                <Image source={{ uri: topic.authorAvatar }} style={styles.authorAvatar} />
                <Text style={styles.authorName}>{topic.author}</Text>
                <Text style={styles.dateText}>{topic.date}</Text>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Icon name="eye" size={12} color="#6B7280" />
                    <Text style={styles.statsText}>{topic.views}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Icon name="comment-o" size={12} color="#6B7280" />
                    <Text style={styles.statsText}>{topic.replies}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 主体内容 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* 子版块 */}
        <View style={styles.sectionContainer}>
          {renderSubForums()}
        </View>

        {/* 主题标签分类 */}
        <View style={styles.sectionContainer}>
          {renderTagButtons()}
        </View>

        {/* 分类导航 */}
        {renderTabButtons()}

        {/* 主题内容区域 */}
        <View style={styles.topicsContainer}>
          {renderTopicContent()}
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
  breadcrumb: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  breadcrumbIcon: {
    marginHorizontal: 4,
  },
  breadcrumbActiveText: {
    fontSize: 16,
    color: '#2563EB',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  navAvatar: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  subForumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  subForumItem: {
    width: '25%',
    paddingHorizontal: 8,
  },
  subForumButton: {
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subForumText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tagsScrollView: {
    flexGrow: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tagButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    marginRight: 8,
    borderWidth: 1,
  },
  blueTag: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  blueTagText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  greenTag: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  greenTagText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
  },
  purpleTag: {
    backgroundColor: '#F5F3FF',
    borderColor: '#EDE9FE',
  },
  purpleTagText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '500',
  },
  yellowTag: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  yellowTagText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '500',
  },
  redTag: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  redTagText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  pinkTag: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FCE7F3',
  },
  pinkTagText: {
    color: '#DB2777',
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    zIndex: 10,
  },
  tabsContainerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  tabsScrollView: {
    flexGrow: 0,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '500',
  },
  topicsContainer: {
    paddingHorizontal: 16,
  },
  stickyTopicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  importantTopicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  recommendTopicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  forumTopicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stickyBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  stickyBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  importantBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  importantBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  recommendBadge: {
    backgroundColor: '#10B981',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  recommendBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  typeBadge: {
    backgroundColor: '#6B7280',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  topicTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  topicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 4,
  },
  authorName: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  authorNameBlue: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
    marginRight: 8,
  },
  authorNameYellow: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    marginRight: 8,
  },
  authorNameGreen: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
});

export default ForumView;
