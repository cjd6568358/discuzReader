import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Pressable,
  Vibration
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Swiper from 'react-native-swiper';
import SortableModal from '../components/SortableModal';
import { useLoading } from '../components/Loading';
import { getHomePage } from '../utils/api';
import { storage } from '../utils/index';

const IndexView = () => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [pageData, setPageData] = useState(null);
  const [currentSection, setCurrentSection] = useState('');
  const [sections, setSections] = useState([]);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  useEffect(() => {
    showLoading()
    getHomePage().then(data => {
      console.log(data);
      setPageData(data);
      let sourceSections = data.sectionList
      // 从存储中获取已保存的排序，如果没有则使用默认顺序
      let sortedSections = JSON.parse(storage.getString('sortedSections') || '[]');
      if (Array.isArray(sortedSections) && sortedSections.length > 0) {
        for (let i = 0; i < sortedSections.length; i++) {
          const element = sortedSections[i];
          const sourceIndex = sourceSections.findIndex(s => s.name === element.name);
          if (sourceIndex === -1) {
            sortedSections.splice(i, 1);
            i--;
          } else {
            sourceSections.splice(sourceIndex, 1);
          }
        }
        sortedSections = sortedSections.concat(sourceSections);
        setSections(sortedSections);
        setCurrentSection(sortedSections[0].name);
        handleSortEnd(sortedSections);
      } else {
        setSections(data.sectionList);
        setCurrentSection(data.sectionList[0].name);
      }
    }).catch(error => {
      console.log(error);
      if (error === 'redirect login') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      }
    }).finally(() => {
      hideLoading();
    });
  }, [])

  const onAnnouncementPress = (item) => {
    console.log(item);
  }

  const onForumPress = (item) => {
    console.log(item);
    navigation.navigate('Forum', {
      href: item.href,
    })
  }

  // 处理长按打开排序Modal
  const handleLongPress = () => {
    Vibration.vibrate(50); // 触觉反馈
    setSortModalVisible(true);
  };

  // 处理排序完成，保存排序结果
  const handleSortEnd = (sortedData) => {
    setSections(sortedData);
    storage.set('sortedSections', JSON.stringify(sortedData));
  };

  // 渲染分区按钮
  const renderSection = ({ item }) => (
    <Pressable
      onPress={() => setCurrentSection(item.name)}
      onLongPress={handleLongPress}
      delayLongPress={500}
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

  const renderForum = ({ item }) => (
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
            {item.children.map(subItem => <Pressable key={subItem.name} onPress={() => onForumPress(subItem)} style={styles.subforumTag}>
              <Text style={styles.subforumName}>{subItem.name}</Text>
            </Pressable>)}
          </View>

          <View style={styles.forumStats}>
            <View style={styles.statItem}>
              <Icon name="hashtag" size={12} color="#2563EB" />
              <Text style={styles.statText}>{item.thread}</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="comments" size={12} color="#2563EB" />
              <Text style={styles.statText}>{item.post}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      {/* 顶部导航栏 */}
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>{pageData?.title || ''}</Text>
        {/* 搜索栏 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              placeholder="搜索帖子、用户"
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
              onFocus={() => navigation.navigate('Search')}
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 公告栏 */}
        <View style={{ marginVertical: 8 }}>
          {pageData?.announcementList.length > 0 && <Swiper
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
          </Swiper>}
        </View>

        {/* 分区导航 */}
        <View style={styles.sectionsContainer}>
          {sections.length > 0 && (
            <FlatList
              data={sections}
              renderItem={renderSection}
              keyExtractor={(item) => item.name}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionsList}
            />
          )}
        </View>

        {/* 子版块列表 */}
        {currentSection && <View style={styles.forumsContainer}>
          <FlatList
            data={sections.find((section) => section.name === currentSection)?.children || []}
            renderItem={renderForum}
            keyExtractor={(item) => item.name}
            scrollEnabled={false}
          />
        </View>}

        {/* 排序Modal */}
        <SortableModal
          visible={sortModalVisible}
          onClose={() => setSortModalVisible(false)}
          data={sections}
          onSortEnd={handleSortEnd}
          title="分区导航排序"
        />
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
    flexDirection: 'row',
  },
  sectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
