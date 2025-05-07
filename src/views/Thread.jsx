import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Pressable,
  ScrollView,
  ToastAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Pagination from '../components/Pagination';
import ActionSheet from '../components/ActionSheet';
import { useLoading } from '../components/Loading';
import { getForumPage } from '../utils/api'
import { MMStore, storage } from '../utils/index';

const Thread = () => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [longPressKey, setLongPressKey] = useState(null);
  const [pageData, setPageData] = useState(null);
  const authorAvatar = 'https://ai-public.mastergo.com/ai/img_res/6318212c8a4babf6dde0bae414594b63.jpg';
  const contentImage = 'https://ai-public.mastergo.com/ai/img_res/21460918cb4ed61b904dc2d2eff5333b.jpg';

  const renderPage = useCallback((href) => {
    showLoading()
    getForumPage(href).then(data => {
      console.log(data);
      setPageData(data);
      const { pagination } = data
      ToastAndroid.show(`${pagination.current}/${pagination.last}`, ToastAndroid.SHORT);
    }).catch(error => {
      console.log(error);
    }).finally(() => {
      hideLoading();
    });
  })

  const actionSheetOptions = [
    { text: '查看历史发言', onPress: () => handleActionSheetItemPress('searchUid') },
    // { text: '加入黑名单', destructive: true, onPress: handleActionSheetItemPress('block') },
  ];

  const handleActionSheetItemPress = async (action) => {
    if (action === 'clearCache') {
    } else if (action === 'block') {
      
    }
    setLongPressKey(null)
  }

  const handleLongPress = (key) => {
    setLongPressKey(key);
    setActionSheetVisible(true)
  };

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

  const renderReplyItem = ({ item, index }) => (
    <Pressable onLongPress={() => handleLongPress(item)} style={styles.replyItem}>
      <View style={styles.replyContent}>
        <Image source={{ uri: item.avatar }} style={styles.replyAvatar} />
        <View style={styles.replyBody}>
          <View style={styles.replyHeader}>
            <View style={styles.replyUserInfo}>
              <Text style={styles.replyUsername}>{item.username}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{item.level}</Text>
              </View>
            </View>
            <Text style={styles.replyNumber}>#{index + 1}</Text>
          </View>
          <Text style={styles.replyText}>{item.content}</Text>
          <View style={styles.replyFooter}>
            <Text style={styles.replyTime}>{item.time}</Text>
            <View style={styles.replyActions}>
              <Pressable style={styles.replyAction}>
                <Icon name="thumbs-o-up" size={14} color="#6B7280" style={styles.actionIcon} />
                <Text style={styles.actionText}>{item.likes}</Text>
              </Pressable>
              <Pressable style={styles.replyAction}>
                <Icon name="comment-o" size={14} color="#6B7280" style={styles.actionIcon} />
                <Text style={styles.actionText}>回复</Text>
              </Pressable>
            </View>
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
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={18} color="#6B7280" />
        </Pressable>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle} numberOfLines={1}>热门话题讨论区</Text>
          <View style={styles.navSubtitle}>
            <Text style={styles.navSubtitleText}>社区讨论</Text>
            <Icon name="chevron-right" size={10} color="#9CA3AF" style={styles.navIcon} />
            <Text style={styles.navSubtitleHighlight}>热门话题</Text>
          </View>
        </View>
        <View style={styles.navActions}>
          <Pressable style={styles.bookmarkButton}>
            <Icon name="bookmark" size={18} color="#6B7280" />
          </Pressable>
          <Image
            source={{ uri: 'https://ai-public.mastergo.com/ai/img_res/e7b203c4536f10fe9ff12728eea37141.jpg' }}
            style={styles.userAvatar}
          />
        </View>
      </View>

      {/* 主要内容区域 */}
      <ScrollView style={styles.scrollView}>
        {/* 帖子标题 */}
        <View style={styles.postContainer}>
          <Text style={styles.postTitle}>2024 年互联网行业发展趋势分析与讨论</Text>

          {/* 作者信息 */}
          <View style={styles.authorContainer}>
            <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
            <View style={styles.authorInfo}>
              <View style={styles.authorNameContainer}>
                <Text style={styles.authorName}>科技未来派</Text>
                <View style={styles.authorBadge}>
                  <Text style={styles.authorBadgeText}>LV.8</Text>
                </View>
              </View>
              <Text style={styles.postTime}>2024 年 1 月 15 日 14:30</Text>
            </View>
          </View>

          {/* 帖子内容 */}
          <View style={styles.postContent}>
            <Text style={styles.postText}>随着人工智能技术的快速发展，2024 年互联网行业将迎来新的变革。以下是我对几个重要领域的观察和思考：</Text>
            <Image source={{ uri: contentImage }} style={styles.postImage} />
            <Text style={styles.postPoint}>1. AI 应用将进一步普及，更多传统行业将开始数字化转型</Text>
            <Text style={styles.postPoint}>2. 元宇宙概念将逐渐落地，AR/VR 技术将有重大突破</Text>
            <Text style={styles.postPoint}>3. 数据安全和隐私保护将成为重中之重</Text>
          </View>

          {/* 帖子数据 */}
          <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Icon name="eye-slash" size={14} color="#6B7280" style={styles.statIcon} />
              <Text style={styles.statText}>1,234 浏览</Text>
            </View>
            <Text style={styles.statDivider}>|</Text>
            <View style={styles.statItem}>
              <Icon name="comment-o" size={14} color="#6B7280" style={styles.statIcon} />
              <Text style={styles.statText}>89 回复</Text>
            </View>
          </View>
        </View>

        {/* 回复列表 */}
        <FlatList
          data={[]}
          renderItem={renderReplyItem}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
          style={styles.repliesList}
        />

        {pageData?.pagination && <View style={styles.pageContainer}>
          <Text style={styles.pageCount}>{pageData.pagination.current} / {pageData.pagination.last}</Text>
        </View>}
      </ScrollView>

      {/* 底部评论栏 */}
      <View style={styles.commentBar}>
        <View style={styles.commentInputContainer}>
          <Icon name="comment-o" size={16} color="#9CA3AF" style={styles.commentIcon} />
          <TextInput
            placeholder="写下你的评论..."
            style={styles.commentInput}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <Pressable style={styles.sendButton}>
          <Text style={styles.sendButtonText}>发送</Text>
        </Pressable>
      </View>

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
  navbar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  navTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  navSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  navSubtitleText: {
    fontSize: 12,
    color: '#6B7280',
  },
  navIcon: {
    marginHorizontal: 4,
  },
  navSubtitleHighlight: {
    fontSize: 12,
    color: '#2563EB',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookmarkButton: {
    padding: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  scrollView: {
    flex: 1,
  },
  postContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 28,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  authorBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#EBF5FF',
    borderRadius: 4,
  },
  authorBadgeText: {
    fontSize: 12,
    color: '#2563EB',
  },
  postTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  postContent: {
    marginTop: 16,
  },
  postText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 192,
    borderRadius: 8,
    marginVertical: 16,
  },
  postPoint: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginTop: 8,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 4,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statDivider: {
    marginHorizontal: 16,
    color: '#6B7280',
  },
  repliesList: {
    marginTop: 8,
  },
  replyItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  replyContent: {
    flexDirection: 'row',
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  replyBody: {
    flex: 1,
    marginLeft: 12,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  replyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyUsername: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  levelBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  levelText: {
    fontSize: 12,
    color: '#6B7280',
  },
  replyNumber: {
    fontSize: 14,
    color: '#6B7280',
  },
  replyText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginTop: 8,
  },
  replyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  replyTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  replyActions: {
    flexDirection: 'row',
    gap: 16,
  },
  replyAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  paginationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  paginationButtonDisabled: {
    borderColor: '#E5E7EB',
  },
  pageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageInput: {
    width: 40,
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 14,
    color: '#111827',
    marginRight: 4,
  },
  pageCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentIcon: {
    marginRight: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
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

export default Thread;
