import React, { useState, useCallback } from 'react';
import {
  // ActivityIndicator,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Pressable
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TabBar from '../components/TabBar';
import Icon from 'react-native-vector-icons/FontAwesome';
import Swiper from 'react-native-swiper';
import { useLoading } from '../components/Loading';
import { getIndexPage } from '../utils/api';

const IndexView = () => {
  const { showLoading, hideLoading } = useLoading();
  const [pageData, setPageData] = useState(null);
  const [currentSection, setCurrentSection] = useState('');
  useFocusEffect(
    useCallback(() => {
      showLoading()
      getIndexPage().then(data => {
        console.log(data);
        setPageData(data);
        setCurrentSection(data.sectionList[0].name);
      }).catch(error => {
        console.log(error);
      }).finally(() => {
        hideLoading();
      });
      return () => {
        // Do something when the screen is unfocused
        // Useful for cleanup functions
      };
    }, []))

  const onAnnouncementPress = (item) => {
    console.log(item);
  }

  const onForumPress = (item) => {
    console.log(item);
  }

  const onSubForumPress = (item) => {
    console.log(item);
  }

  const renderSection = ({ item }) => (
    <Pressable
      onPress={() => setCurrentSection(item.name)}
      style={[
        styles.sectionButton,
        currentSection === item.name ? styles.activeSectionButton : styles.inactiveSectionButton
      ]}
    >
      <Text
        style={[
          styles.sectionButtonText,
          currentSection === item.name ? styles.activeSectionText : styles.inactiveSectionText
        ]}
      >
        {item.name}
      </Text>
    </Pressable>
  );

  const renderForum = ({ item, index }) => (
    <Pressable
      key={item.name}
      onPress={() => onForumPress(item)}
      style={styles.forumCard}
    >
      <View style={styles.forumHeader}>
        <View style={styles.forumInfo}>
          <Text style={styles.forumName}>{item.name}{item.today}</Text>
          <Text style={styles.desc}>{item.desc}</Text>

          {item.children.length > 0 && <View><Text style={{ marginTop: 8, color: '#2563EB' }} >子板块：</Text></View>}

          <View style={styles.subforumContainer}>
            {item.children.map(subItem => <Pressable key={subItem.name} onPress={() => onSubForumPress(subItem)} style={styles.subforumTag}>
              <Text style={styles.subforumName}>{subItem.name}</Text>
            </Pressable>)}
          </View>

          <View style={styles.forumStats}>
            <View style={styles.statItem}>
              <Icon name="hashtag" size={12} color="#2563EB" />
              <Text style={styles.statText}>{item.topic}</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="comments" size={12} color="#2563EB" />
              <Text style={styles.statText}>{item.thread}</Text>
            </View>
            {item.lastpost_name && <View style={styles.statItem}>
              <Icon name="clock-o" size={12} color="#2563EB" />
              <Text numberOfLines={1} ellipsizeMode="middle" style={styles.statText}>{item.lastpost_name}</Text>
            </View>}
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (!pageData) {
    return (
      <View style={styles.loadingContainer}>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      {/* 顶部导航栏 */}
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>{pageData?.documentTitle}</Text>
        {/* <View style={styles.avatarContainer}>
          <Image source={{ uri: userAvatar }} style={styles.avatar} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </View> */}
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
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 公告栏 */}
        <View style={{ marginVertical: 8 }}>
          <Swiper
            height={56}
            loop={true}
            autoplay={true}
            autoplayTimeout={4}
            horizontal={false}
            showsButtons={false}
            showsPagination={false}
          >
            {
              pageData.announcementList.map((item) => (
                <Pressable key={item.href} onPress={() => onAnnouncementPress(item)}>
                  <View style={styles.announcementContainer} >
                    <View style={styles.announcementBadge}>
                      <Text style={styles.announcementBadgeText}>公告</Text>
                    </View>
                    <Text style={styles.announcementText}>{item.name}</Text>
                  </View>
                </Pressable>
              ))
            }
          </Swiper>
        </View>

        {/* 分区导航 */}
        <View style={styles.sectionsContainer}>
          <FlatList
            data={pageData.sectionList}
            renderItem={renderSection}
            keyExtractor={(item) => item.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionsList}
          />
        </View>

        {/* 子版块列表 */}
        {currentSection && <View style={styles.forumsContainer}>
          <FlatList
            data={pageData.sectionList.find((section) => section.name === currentSection).children}
            renderItem={renderForum}
            keyExtractor={(item) => item.name}
            scrollEnabled={false}
          />
        </View>}
      </ScrollView>

      {/* 底部导航栏 */}
      <TabBar currentTab='Home' />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
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
    width: '50%',
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
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 12,
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
  forumInfo: {
    flex: 1,
  },
  forumName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  desc: {
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  subforumName: {
    fontSize: 12,
    color: '#4B5563',
  },
  forumStats: {
    flexDirection: 'row',
    marginTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  }
});

export default IndexView;
