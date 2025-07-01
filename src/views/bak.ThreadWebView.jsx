import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Alert,
  ToastAndroid,
} from 'react-native';
import WebView from 'react-native-webview';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Pagination from '../components/Pagination';
import ActionSheet from '../components/ActionSheet';
import { useLoading } from '../components/Loading';
import { getThreadPage, favoriteAction } from '../utils/api'
import { MMStore, storage, decodeHtmlEntity } from '../utils/index';
import http from '../utils/http';

const Thread = () => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [longPressKey, setLongPressKey] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [webViewHeight, setWebViewHeight] = useState(300);

  useFocusEffect(useCallback(() => {
    // renderPage(route.params.href)
    renderPage('thread-11332239-1-1.html')
  }, []))

  useEffect(() => {
    pageData && renderHeader()
  }, [pageData])

  const renderHeader = useCallback(() => {
    const isFavorite = MMStore.favorites.map(item => item.tid).includes(pageData.tid);
    navigation.setOptions({
      headerTitle: () => <View style={styles.navTitleContainer}>
        <Text style={styles.navTitle} numberOfLines={1} ellipsizeMode="tail" >{pageData.title}</Text>
        <View style={styles.navSubtitle}>
          {pageData.breadcrumb.slice(1)
            .map((item, i, arr) => <View key={item.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.navSubtitleText}>{item.name}</Text>
              {i < arr.length - 1 && <Icon name="chevron-right" size={10} color="#9CA3AF" style={styles.navIcon} />}
            </View>)
          }
        </View>
      </View>,
      headerRight: () => (
        <View style={styles.navbarRight}>
          <Pressable style={styles.starButton} onPress={toggleFavorite}>
            <Icon name={isFavorite ? "star" : "star-o"} size={18} color={isFavorite ? "#f7ba2a" : "#9CA3AF"} />
          </Pressable>
          <Pressable style={styles.messageButton} onPress={() => navigation.navigate('Message')}>
            <Icon name="envelope" size={18} color={pageData.newMessage > 0 ? '#2563EB' : "#9CA3AF"} />
            {pageData.newMessage > 0 && <Text style={styles.messageBage}>{pageData.newMessage}</Text>}
          </Pressable>
          {pageData.cached && <Pressable style={styles.starButton} onPress={clearCache}>
            <Icon name="paint-brush" size={18} color="#9CA3AF" />
          </Pressable>}
          <Pressable style={styles.starButton} onPress={block}>
            <Icon name="ban" size={18} color="#9CA3AF" />
          </Pressable>
        </View>
      ),
    })
  })

  const clearCache = useCallback(() => {
    delete MMStore.cached[`thread-${pageData.tid}-${pageData.pagination.current}-1.html`]
    setTimeout(() => {
      renderPage(`thread-${pageData.tid}-${pageData.pagination.current}-1.html`)
    }, ToastAndroid.SHORT);
    ToastAndroid.show('缓存已清除', ToastAndroid.SHORT);
  })

  const block = useCallback(() => {
    Alert.alert('提示', '确定要屏蔽此贴吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定', style: 'destructive', onPress: () => {
          const newBlockThreads = (storage.getString('blockThreads') || '').split(',') || [];
          if (!newBlockThreads.includes(pageData.tid)) {
            newBlockThreads.push(pageData.tid);
          }
          storage.setString('blockThreads', newBlockThreads.join(','));
          ToastAndroid.show('已屏蔽', ToastAndroid.SHORT);
        }
      },
      { cancelable: true }
    ])

  })

  const generateHtmlContent = (content) => {
    if (!content) return '<div>无内容</div>';
    
    // 解码HTML实体
    const decodedContent = decodeHtmlEntity(content);
    
    // 添加基本样式
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #374151;
            padding: 0;
            margin: 0;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          a {
            color: #2563EB;
            text-decoration: none;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          table, th, td {
            border: 1px solid #E5E7EB;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          pre, code {
            background-color: #F3F4F6;
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
          }
          blockquote {
            border-left: 4px solid #E5E7EB;
            margin-left: 0;
            padding-left: 16px;
            color: #6B7280;
          }
        </style>
      </head>
      <body>
        ${decodedContent}
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'contentHeight') {
        setWebViewHeight(data.height);
      } else if (data.type === 'linkClicked') {
        handleLinkClick(data.href, data.text);
      }
    } catch (error) {
      console.error('WebView消息解析错误:', error);
    }
  };

  const handleNavigationStateChange = (navState) => {
    // 监控WebView导航状态变化
    console.log('WebView导航状态:', navState);
  };

  const handleShouldStartLoadWithRequest = (request) => {
    // 拦截WebView的链接请求
    const { url } = request;
    
    // 如果是内部链接（相对路径或者同域名），允许WebView加载
    if (url.startsWith('about:blank') || url === 'about:srcdoc') {
      return true;
    }
    
    // 如果是外部链接，拦截并用系统浏览器打开
    if (url.startsWith('http')) {
      handleLinkClick(url);
      return false;
    }
    
    return true;
  };

  const handleLinkClick = (url, text) => {
    console.log('链接被点击:', url, text);
    
    // 判断是否是帖子链接
    if (url.includes('thread-') && url.includes('.html')) {
      // 是帖子链接，使用内部导航
      navigation.navigate('Thread', { href: url });
    } else if (url.includes('forum-') && url.includes('.html')) {
      // 是版块链接，使用内部导航
      navigation.navigate('Forum', { href: url });
    } else {
      // 其他链接输出日志
      console.log('其他链接:', url);
    }
  };

  const renderPage = useCallback((href) => {
    showLoading()
    getThreadPage(href).then(data => {
      console.log(data);
      setPageData(data);
      const { pagination } = data
      if (pagination) {
        ToastAndroid.show(`${pagination.current}/${pagination.last}`, ToastAndroid.SHORT);
      }
    }).catch(error => {
      console.log(error);
    }).finally(() => {
      hideLoading();
    });
  })

  const actionSheetOptions = [
    { text: '查看历史发帖', onPress: () => handleActionSheetItemPress('searchByUid') },
    { text: '回复', destructive: true, onPress: () => handleActionSheetItemPress('reply') },
  ];

  const handleActionSheetItemPress = async (action) => {
    if (action === 'searchByUid') {
    } else if (action === 'reply') {

    }
    setLongPressKey(null)
  }

  const handleLongPress = (key) => {
    setLongPressKey(key);
    setActionSheetVisible(true)
  };

  const toggleFavorite = async () => {
    console.log('toggleFavorite');
    if (MMStore.favorites.map(item => item.tid).includes(pageData.tid)) {
      await favoriteAction('del', pageData.favorite_href, pageData.formhash)
      MMStore.favorites = MMStore.favorites.filter(item => item.tid !== pageData.tid);
      ToastAndroid.show('取消收藏', ToastAndroid.SHORT);
    } else {
      await favoriteAction('add', pageData.favorite_href)
      MMStore.favorites.push({
        tid: pageData.tid,
        title: pageData.title,
      });
      ToastAndroid.show('收藏成功', ToastAndroid.SHORT);
    }
    setPageData(prevData => ({
      ...prevData,
    }))
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
  if (!pageData) {
    return null
  }
  const firstPost = pageData.posts.shift();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 主要内容区域 */}
      <ScrollView style={styles.scrollView}>
        {/* 帖子标题 */}
        <View style={styles.postContainer}>
          <Text style={styles.postTitle}>{pageData?.title}</Text>

          {/* 作者信息 */}
          <View style={styles.authorContainer}>
            <Image source={{ uri: firstPost.author.avatar }} style={styles.authorAvatar} />
            <View style={styles.authorInfo}>
              <View style={styles.authorNameContainer}>
                <Text style={styles.authorName}>{firstPost.author.name}</Text>
                <View style={styles.authorBadge}>
                  <Text style={styles.authorBadgeText}>{firstPost.author.level}</Text>
                </View>
                <Text style={styles.replyNumber}>#{firstPost.floor}</Text>
              </View>
              <Text style={styles.postTime}>{firstPost.date}</Text>
            </View>
          </View>

          {/* 帖子内容 */}
          <View style={styles.postContent}>
            <WebView
              originWhitelist={['*']}
              source={{ 
                html: generateHtmlContent(firstPost.content),
                baseUrl: http.defaults.baseURL,
              }}
              style={[styles.webView, { height: webViewHeight }]}
              scrollEnabled={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleWebViewMessage}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
              injectedJavaScript={`
                (function() {
                  const height = Math.max(document.body.scrollHeight, document.body.offsetHeight);
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'contentHeight', height }));
                  
                  document.addEventListener('click', function(e) {
                    if(e.target && e.target.tagName === 'A') {
                      e.preventDefault();
                      window.ReactNativeWebView.postMessage(JSON.stringify({ 
                        type: 'linkClicked', 
                        href: e.target.href,
                        text: e.target.innerText
                      }));
                      return false;
                    }
                  }, true);
                })();
              `}
            />
          </View>

          {/* 帖子数据 */}
          {/* <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Icon name="eye-slash" size={14} color="#6B7280" style={styles.statIcon} />
              <Text style={styles.statText}>1,234 浏览</Text>
            </View>
            <Text style={styles.statDivider}>|</Text>
            <View style={styles.statItem}>
              <Icon name="comment-o" size={14} color="#6B7280" style={styles.statIcon} />
              <Text style={styles.statText}>89 回复</Text>
            </View>
          </View> */}
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
  webView: {
    width: '100%',
    backgroundColor: 'transparent',
    marginVertical: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    marginLeft: 8,
  },
  messageButton: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
