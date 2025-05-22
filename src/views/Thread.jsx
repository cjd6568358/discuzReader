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
  Alert,
  ToastAndroid,
  useWindowDimensions,
  Modal,
} from 'react-native';
import Swiper from 'react-native-swiper';
import RenderHtml, { HTMLElementModel, HTMLContentModel } from 'react-native-render-html';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Pagination from '../components/Pagination';
import ActionSheet from '../components/ActionSheet';
import { useLoading } from '../components/Loading';
import { getThreadPage, favoriteAction } from '../utils/api'
import { MMStore, storage, decodeHtmlEntity, downloadFile } from '../utils/index';

const Thread = () => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [longPressKey, setLongPressKey] = useState(null);
  const [pageData, setPageData] = useState(null);
  const { width, height } = useWindowDimensions();
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState('');

  useFocusEffect(useCallback(() => {
    // renderPage(route.params.href)
    renderPage('thread-9831798-1-2.html')
  }, []))

  useEffect(() => {
    pageData && renderHeader()
  }, [pageData])

  const renderHeader = useCallback(() => {
    const isFavorite = MMStore.favorites.threads.includes(pageData.tid);
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

  const handleLinkPress = (href) => {
    console.log('handleLinkPress', href);
    if (href.includes('thread-') || href.includes('viewthread') || href.includes('redirect.php?tid=')) {
      navigation.navigate('Thread', { href });
    } else if (href.includes('forum-') || href.includes('forumdisplay')) {
      navigation.navigate('Forum', { href });
    } else if (href.includes('attachment.php')) {
      downloadFile(href);
    } else if (/\.(png|jpg|jpeg|gif|jpeg|webp)$/.test(href)) {
      // 处理附件图片点击，查看大图
      setCurrentImage(href);
      setImageViewerVisible(true);
    } else {
      // 其他类型的链接
      console.log('未处理的链接类型:', href);
      ToastAndroid.show('未支持的链接类型', ToastAndroid.SHORT);
    }
  }

  const handleLongPress = (key) => {
    setLongPressKey(key);
    setActionSheetVisible(true)
  };

  const toggleFavorite = async () => {
    console.log('toggleFavorite');
    if (MMStore.favorites.threads.includes(pageData.tid)) {
      await favoriteAction('del', pageData.favorite_href, pageData.formhash)
      MMStore.favorites.threads = MMStore.favorites.threads.filter(item => item !== pageData.tid);
      ToastAndroid.show('取消收藏', ToastAndroid.SHORT);
    } else {
      await favoriteAction('add', pageData.favorite_href)
      MMStore.favorites.threads.push(pageData.tid);
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
  let firstPost = pageData.posts.filter(post => post.floor === 1)[0];
  const imageAttachments = firstPost?.attachments.filter(item => item.icon.includes('image.gif'));
  console.log('firstPost', firstPost);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 主要内容区域 */}
      <ScrollView style={styles.scrollView}>
        {/* 帖子标题 */}
        {firstPost && <View style={styles.postContainer}>
          {/* <Text style={styles.postTitle}>{pageData?.title}</Text> */}

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
            {firstPost.content && (
              <RenderHtml
                contentWidth={width}
                source={{ html: decodeHtmlEntity(firstPost.content) }}
                tagsStyles={htmlStyles}
                customHTMLElementModels={{
                  // fieldset: HTMLElementModel.fromCustomModel({
                  //   contentModel: HTMLContentModel.block
                  // }),
                }}
                renderersProps={{
                  a: {
                    onPress: (event, href) => handleLinkPress(href)
                  },
                  img: {
                    enableExperimentalPercentWidth: true,
                    computeImagesMaxWidth: 150,
                    onPress: (event, src) => {
                      if (src.startsWith('attachments/')) {
                        handleLinkPress(src);
                      }
                    }
                  }
                }}
                baseStyle={{ fontSize: 16, lineHeight: 24, color: '#374151' }}
                defaultViewProps={{ style: { marginVertical: 8 } }}
              />
            )}
          </View>
          {firstPost?.attachments && firstPost.attachments.length > 0 && (
            <View style={styles.attachmentContainer}>
              <Text style={styles.attachmentTitle}>附件</Text>

              {/* 图片附件轮播图 */}
              {imageAttachments.length > 0 && (
                <View style={styles.imageCarouselContainer}>
                  <Swiper
                    height={240}
                    loop={true}
                    autoplay={false}
                    autoplayTimeout={4}
                    showsButtons={false}
                    paginationStyle={styles.swiperPagination}
                    dotStyle={styles.swiperDot}
                    activeDotStyle={styles.swiperActiveDot}
                  >
                    {imageAttachments.map((item, index) => (
                      <Pressable
                        key={index}
                        style={styles.imageSlide}
                        onPress={() => handleLinkPress(item.url || item.link)}
                        onLongPress={() => downloadFile(item.url || item.link)}
                      >
                        <Image
                          source={{ uri: item.url || item.link }}
                          style={styles.carouselImage}
                          resizeMode="cover"
                        />
                        <Text style={styles.imageCaption} numberOfLines={1}>{item.name}</Text>
                      </Pressable>
                    ))
                    }
                  </Swiper>
                </View>
              )}

              {/* 非图片附件列表 */}
              <FlatList
                data={firstPost.attachments.filter(item => !item.icon.includes('image.gif'))}
                keyExtractor={(item) => item.name}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.attachmentItem}
                    onPress={() => handleLinkPress(item.url || item.link)}
                  >
                    <View style={styles.attachmentIconContainer}>
                      {item.icon.includes('zip.gif') ? (
                        <Icon name="file-archive-o" size={20} color="#D97706" />
                      ) : (
                        <Icon name="file-o" size={20} color="#6B7280" />
                      )}
                    </View>
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.attachmentMeta}>
                        <Text style={styles.attachmentSize}>{item.size}</Text>
                        <Text style={styles.attachmentDate}>{item.date}</Text>
                      </View>
                    </View>
                    {item.icon.includes('zip.gif') && <Icon name="download" size={16} color="#6B7280" />}
                  </Pressable>
                )}
              />
            </View>
          )}

          {firstPost?.legend && firstPost.legend.length > 0 && (
            <View style={styles.rateContainer}>
              <Text style={styles.rateTitle}>评分</Text>
              {firstPost.legend.map((item, index) => (
                <View key={index} style={styles.rateItem}>
                  <Icon name="trophy" size={14} color="#f7ba2a" style={styles.rateIcon} />
                  <Text style={styles.rateText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
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
        </View>}

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

      {/* 图片查看器 */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <Pressable
            style={styles.imageMask}
            onPress={() => setImageViewerVisible(false)}
          >
          </Pressable>
          <Image
            source={{ uri: currentImage }}
            style={styles.imageViewerImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// HTML内容样式
const htmlStyles = {
  p: {
    marginVertical: 8,
  },
  a: {
    color: '#2563EB',
    textDecorationLine: 'none',
  },
  img: {
    marginVertical: 8,
    maxWidth: '100%',
    width: 'auto',
    height: 'auto',
    alignSelf: 'flex-start',
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 16,
    marginLeft: 0,
    color: '#6B7280',
  },
  pre: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
  },
  code: {
    backgroundColor: '#F3F4F6',
    padding: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    marginVertical: 8,
  },
  th: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  td: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // 添加.t_msgfont及其子节点的样式
  '.t_msgfont': {
    fontSize: 20,
    lineHeight: 1.6,
  },
  '.t_msgfont td': {
    fontSize: 20,
    lineHeight: 1.6,
  },
  '.t_msgfont li': {
    marginLeft: 16, // 对应HTML中的2em
  },
  '.t_msgfont a': {
    color: '#2563EB',
  },
  '.t_bigfont': {
    fontSize: 24,
    lineHeight: 1.6,
  },
  '.t_smallfont': {
    fontSize: 16,
    lineHeight: 1.6,
  },
  // 添加div样式，因为帖子内容通常在div中
  div: {
    marginVertical: 4,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '80%',
  },
  imageMask: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  // 图片轮播样式
  imageCarouselContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imageSlide: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  imageCaption: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#FFFFFF',
    fontSize: 12,
    padding: 4,
    textAlign: 'center',
  },
  swiperPagination: {
    bottom: 5,
  },
  swiperDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 3,
    marginRight: 3,
  },
  swiperActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 3,
    marginRight: 3,
  },
  // 附件样式
  attachmentContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  attachmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  attachmentMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  attachmentSize: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  attachmentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  // 评分样式
  rateContainer: {
    marginTop: 16,
    padding: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  rateTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rateIcon: {
    marginRight: 8,
  },
  rateText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
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
    marginLeft: "auto"
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
