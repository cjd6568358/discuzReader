import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ToastAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Pagination from '../components/Pagination';
import ActionSheet from '../components/ActionSheet';
import { useLoading } from '../components/Loading';
import { getForumPage, favoriteAction } from '../utils/api'
import { MMStore, storage } from '../utils/index';

const tagColors = [
  {
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  {
    color: '#059669',
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  {
    color: '#7C3AED',
    backgroundColor: '#F5F3FF',
    borderColor: '#EDE9FE',
  },
  {
    color: '#D97706',
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  {
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  {
    color: '#DB2777',
    backgroundColor: '#FDF2F8',
    borderColor: '#FCE7F3',
  }
]

const ForumView = ({ route }) => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [longPressKey, setLongPressKey] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [tags, setTags] = useState([])
  const [threads, setThreads] = useState([]);
  const [blockThreads, setBlockThreads] = useState(() => {
    return (storage.getString('blockThreads') || '').split(',') || [];
  })
  const scrollViewRef = useRef(null);

  useEffect(() => {
    renderPage(route.params.href)
  }, [])

  useEffect(() => {
    pageData && renderHeader()
  }, [pageData])

  const actionSheetOptions = [
    { text: '清除缓存', onPress: () => handleActionSheetItemPress('clearCache') },
    { text: '加入黑名单', destructive: true, onPress: () => handleActionSheetItemPress('block') },
  ];

  const handleLongPress = (key) => {
    setLongPressKey(key);
    setActionSheetVisible(true)
  };

  const handleActionSheetItemPress = async (action) => {
    if (action === 'clearCache') {
      delete MMStore.cached[longPressKey]
    } else if (action === 'block') {
      setBlockThreads(prev => {
        const newBlockThreads = [...prev, longPressKey];
        storage.setString('blockThreads', newBlockThreads.join(','));
        return newBlockThreads;
      })
    }
    setLongPressKey(null)
  }

  const renderPage = useCallback((href) => {
    showLoading()
    getForumPage(href).then(data => {
      console.log(data);
      setPageData(data);
      const { filter_tags, action_tags, categorys } = data
      let tmpTagColors = [...tagColors]
      const colorMap = {}
      const tags = filter_tags.concat(action_tags).map((item) => {
        colorMap[item.id] = tmpTagColors.shift()
        return {
          ...item,
          colors: colorMap[item.id]
        }
      })
      setTags(tags)
      const threadMap = new Map();
      categorys.forEach((item) => {
        item.threads.forEach((thread) => {
          const tid = thread.href.split('-')[1];
          if (blockThreads.includes(tid)) {
            return;
          }
          if (thread.tag?.id && !colorMap[thread.tag.id]) {
            colorMap[thread.tag.id] = tmpTagColors.shift()
          }
          threadMap.set(thread.href, ({ ...thread, colors: colorMap[thread.tag?.id] }));
        });
      }, [])
      setThreads(Array.from(threadMap.values()))
      // if (pagination) {
      //   ToastAndroid.show(`${pagination.current}/${pagination.last}`, ToastAndroid.SHORT);
      // }
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
      scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
    });
  })

  const renderHeader = useCallback(() => {
    // const isFavorite = MMStore.favorites.forums.includes(pageData.fid);
    navigation.setOptions({
      headerTitle: () => <View style={styles.breadcrumb}>
        {
          pageData.breadcrumb.slice(1).map((item) => (
            <View key={item.name} style={styles.breadcrumbItem}>
              <Text style={styles.breadcrumbText}>{item.name}</Text>
              <Icon name="chevron-right" size={10} color="#9CA3AF" style={styles.navIcon} />
            </View>
          ))
        }
        <Text style={styles.navTitle} numberOfLines={1}>{pageData.title}</Text>
      </View>,
      headerRight: () => (
        <View style={styles.navbarRight}>
          {/* <Pressable style={styles.starButton} onPress={toggleFavorite}>
            <Icon name={isFavorite ? "star" : "star-o"} size={18} color={isFavorite ? "#f7ba2a" : "#9CA3AF"} />
          </Pressable> */}
          <Pressable style={styles.messageButton} onPress={() => navigation.navigate('Home', { screen: 'Message' })}>
            <Icon name="envelope" size={18} color={pageData.newMessage > 0 ? '#2563EB' : "#9CA3AF"} />
            {pageData.newMessage > 0 && <Text style={styles.messageBage}>{pageData.newMessage}</Text>}
          </Pressable>
          <Pressable style={styles.newSpecialButton} onPress={() => navigation.navigate('Post', { href: pageData.new_special, fid: pageData.fid })}>
            <Icon name="file-text-o" size={18} color="#9CA3AF" />
          </Pressable>
        </View>
      ),
    })
  })

  const toggleFavorite = async () => {
    console.log('toggleFavorite');
    if (MMStore.favorites.forums.includes(pageData.fid)) {
      await favoriteAction('del', pageData.favorite_href, pageData.formhash)
      MMStore.favorites.forums = MMStore.favorites.forums.filter(item => item !== pageData.fid);
      ToastAndroid.show('取消收藏', ToastAndroid.SHORT);
    } else {
      await favoriteAction('add', pageData.favorite_href)
      MMStore.favorites.forums.push(pageData.fid);
      ToastAndroid.show('收藏成功', ToastAndroid.SHORT);
    }
    setPageData(prevData => ({
      ...prevData,
    }))
  }

  const onForumPress = (item) => {
    console.log('onForumPress', item);
    navigation.push('Forum', {
      href: item.href,
    })
  }

  const onTagPress = (item) => {
    renderPage(item.href)
  }

  const onThreadPress = (item) => {
    console.log('onThreadPress', item);
    navigation.navigate('Thread', {
      href: item.href,
    })
  }

  const onPrevPress = () => {
    console.log('onPrevPress');
    const { current, siblings } = pageData.pagination;
    siblings.forEach((item) => {
      if (item.page === current - 1) {
        renderPage(item.href)
      }
    })
  }

  const onNextPress = () => {
    console.log('onNextPress');
    const { current, siblings } = pageData.pagination;
    siblings.forEach((item) => {
      if (item.page === current + 1) {
        renderPage(item.href)
      }
    })
  }

  const renderSubForums = (forums = []) => (
    <View style={styles.subForumContainer}>
      {forums.map(subItem => <Pressable key={subItem.name} onPress={() => onForumPress(subItem)} style={styles.subForumTag}>
        <Text style={styles.subForumName}>{subItem.name}</Text>
      </Pressable>)}
    </View>
  );

  const renderTags = (tags = []) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScrollView}>
      <View style={styles.tagsContainer}>
        {
          tags.map((tag) => <Pressable key={tag.name} onPress={() => onTagPress(tag)} style={[styles.tagButton, tag.colors]}>
            <Text style={[styles.tagText, { color: tag.colors?.color }]}>#{tag.name}</Text>
          </Pressable>)
        }
      </View>
    </ScrollView>
  );

  const renderThreads = () => {
    return threads.map(thread => (
      <Pressable key={thread.href} onPress={() => onThreadPress(thread)} onLongPress={() => handleLongPress(thread.href)} style={styles.forumThreadCard}>
        <View style={styles.tagContainer}>
          {thread.forum ? <View>
            <Text style={[styles.tagBadgeText, { color: thread.colors?.color }]}>{thread.forum.name}</Text>
          </View> : <>
            {thread.tag && <View style={[styles.tagBadge, thread.colors]}>
              <Text style={[styles.tagBadgeText, { color: thread.colors?.color }]}>{thread.tag.name}</Text>
            </View>}
            {thread.attach && <Icon style={{ marginRight: 8 }} name="chain" size={12} color="#2563EB" />}
            {thread.digest && <Icon style={{ marginRight: 8 }} name="diamond" size={12} color="#2563EB" />}
          </>}
          <View style={styles.statsContainer}>
            {thread.thanks > 0 && <View style={styles.statItem}>
              <Icon name="heart" size={12} color="#FF0000" />
              <Text style={styles.statsText}>{thread.thanks}</Text>
            </View>}
            {thread.reply > 0 && <View style={styles.statItem}>
              <Icon name="comments" size={12} color="#2563EB" />
              <Text style={styles.statsText}>{thread.reply}</Text>
            </View>}
            {thread.view > 0 && <View style={styles.statItem}>
              <Icon name="eye" size={12} color="#2563EB" />
              <Text style={styles.statsText}>{thread.view}</Text>
            </View>}
          </View>
        </View>
        <View style={styles.threadHeader}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.threadTitle}>{thread.title}{thread.permission && `[阅读${thread.permission}]`}</Text>
        </View>
        <View style={styles.threadFooter}>
          <Text style={styles.authorName}>{thread.author}</Text>
          <Text style={styles.dateText}>{thread.date}</Text>
          <Text style={styles.permissionText}>{thread.permission && `[阅读权限${thread.permission}]`}</Text>
          {thread.lastPost && <View style={styles.lastPost}>
            <Text style={{ fontSize: 12 }}>最后回复:</Text>
            <Text style={styles.lastPostText}>{thread.lastPost.date}</Text>
          </View>}
        </View>
      </Pressable>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 主体内容 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        ref={view => scrollViewRef.current = view}
      >
        {/* 子版块 */}
        {pageData?.children?.length > 0 && <View style={styles.sectionContainer}>
          {renderSubForums(pageData.children)}
        </View>}

        {/* 主题标签分类 */}
        <View style={styles.sectionContainer}>
          {tags.length > 0 && renderTags(tags)}
        </View>

        {/* 主题内容区域 */}
        {threads.length > 0 && <View style={styles.threadContainer}>
          {renderThreads()}
        </View>}
        {pageData?.pagination && <View style={styles.pageContainer}>
          <Text style={styles.pageCount}>{pageData.pagination.current} / {pageData.pagination.last}</Text>
        </View>}
      </ScrollView>

      {/* 悬浮分页控制器 */}
      {pageData?.pagination && <Pagination {...pageData.pagination} onPrevPress={onPrevPress} onNextPress={onNextPress} ></Pagination>}

      <ActionSheet
        visible={actionSheetVisible}
        options={actionSheetOptions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="取消"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  navIcon: {
    marginHorizontal: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2563EB',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 90,
    gap: 8,
  },
  starButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButton: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBage: {
    position: 'absolute',
    fontSize: 8,
    right: 0,
    top: 4,
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: 'red'
  },
  newSpecialButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  subForumContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  subForumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  subForumName: {
    fontSize: 12,
    color: '#4B5563',
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
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  threadContainer: {
    paddingHorizontal: 16,
  },
  forumThreadCard: {
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
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: '#6B7280',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  tagBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  threadTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  threadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
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
  permissionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  statsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  lastPost: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  lastPostText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  pageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  pageCount: {
    fontSize: 16,
    marginLeft: 4,
  },
});

export default ForumView;
