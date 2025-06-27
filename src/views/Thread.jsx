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
  useWindowDimensions,
  Modal,
} from 'react-native';
import Swiper from 'react-native-swiper';
import RenderHtml, { HTMLElementModel, HTMLContentModel } from 'react-native-render-html';
import { useNavigation } from '@react-navigation/native';
import CookieManager from '@react-native-cookies/cookies';
import Icon from 'react-native-vector-icons/FontAwesome';
import Pagination from '../components/Pagination';
import ActionSheet from '../components/ActionSheet';
import { useLoading } from '../components/Loading';
import ReplyModal from '../components/ReplyModal';
import { getThreadPage, favoriteAction, threadAction, messageAction } from '../utils/api'
import { MMStore, storage, decodeHtmlEntity, downloadFile, userAgent } from '../utils/index';


const Thread = ({ route }) => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [longPressKey, setLongPressKey] = useState(null);
  const [pageData, setPageData] = useState(null);
  const { width } = useWindowDimensions();
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  const [postContent, setPostContent] = useState('');
  const scrollViewRef = useRef(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyTitle, setReplyTitle] = useState('');
  const [selectedNode] = useState(() => storage.getString('selectedNode'));
  const [cookies, setCookies] = useState({});

  useEffect(() => {
    renderPage(route.params.href);
  }, [route.params.href])

  useEffect(() => {
    pageData && renderHeader()
  }, [pageData])

  useEffect(() => {
    CookieManager.get(selectedNode).then((cookies) => {
      console.log('cookies', cookies);
      setCookies(cookies);
    });
  }, [selectedNode]);

  const renderHeader = useCallback(() => {
    const isFavorite = MMStore.favorites.threads.includes(pageData.tid);
    navigation.setOptions({
      headerTitle: () => <View style={styles.navTitleContainer}>
        <Text style={styles.navTitle} numberOfLines={1} ellipsizeMode="tail" >{pageData.title}</Text>
        <View style={styles.navSubtitle}>
          {pageData.breadcrumb.slice(1)
            .map((item, i, arr) => <View key={item.name + i} style={{ flexDirection: 'row', alignItems: 'center' }}>
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
    delete MMStore.cached[`thread-${pageData.tid}-${pageData.pagination?.current || 1}-1.html`]
    setTimeout(() => {
      renderPage(`thread-${pageData.tid}-${pageData.pagination?.current || 1}-1.html`)
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
    return new Promise((resolve, reject) => {
      showLoading()
      getThreadPage(href).then(data => {
        console.log(data);
        setPageData(data);
        // const { pagination } = data
        // if (pagination) {
        //   ToastAndroid.show(`${pagination.current}/${pagination.last}`, ToastAndroid.SHORT);
        // }
        let history = JSON.parse(storage.getString('history') || '[]')
        if (history.find(item => item.tid === data.tid)) {
          history = history.filter(item => item.tid !== data.tid)
        }
        history.push({
          tid: data.tid,
          href,
          title: data.title,
        })
        storage.set('history', JSON.stringify(history))
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
        resolve();
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
      });
    })
  })

  const actionSheetOptions = [
    { text: '搜索', onPress: () => handleActionSheetItemPress('search') },
    { text: '私信', destructive: true, onPress: () => handleActionSheetItemPress('message') },
  ];

  const handleActionSheetItemPress = async (action) => {
    console.log('longPressKey', longPressKey);
    console.log('action', action);
    if (action === 'search') {
      navigation.navigate('Search', {
        srchuname: longPressKey.author.name,
      })
    } else if (action === 'message') {
      setReplyTitle('私信给:' + longPressKey.author.name);
      setReplyModalVisible(true);
    }
    setLongPressKey(null)
    setActionSheetVisible(false);
  }

  const handleLinkPress = (href, name) => {
    if (href.startsWith('about:///')) {
      href = href.replace('about:///', '')
    }
    console.log('handleLinkPress', href);
    if (href.includes('thread-') || href.includes('viewthread') || href.includes('redirect.php?tid=')) {
      // console.log('navigate1', href);
      navigation.push('Thread', { href });
    } else if (href.includes('forum-') || href.includes('forumdisplay')) {
      // console.log('navigate2', href);
      navigation.push('Forum', { href });
    } else if (href.includes('attachment.php') && !/\.(png|jpg|jpeg|gif|webp)$/.test(name)) {
      // console.log('navigate3', href);
      downloadFile(href, name);
    } else if (/\.(png|jpg|jpeg|gif|webp)$/.test(name) || /\.(png|jpg|jpeg|gif|webp)$/.test(href)) {
      // console.log('navigate4', href);
      // 处理附件图片点击，查看大图
      setCurrentImage(href);
      setImageViewerVisible(true);
    } else {
      // 其他类型的链接
      console.log('未处理的链接类型:', href);
      ToastAndroid.show('未支持的链接类型', ToastAndroid.SHORT);
    }
  }

  const handleReplyPress = (key) => {
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

  const handlePostPress = () => {
    console.log('handlePostPress');
    if (!postContent) {
      ToastAndroid.show('请输入评论内容', ToastAndroid.SHORT);
      return
    }
    threadAction({ action: 'reply', href: pageData.replyUrl, formhash: pageData.formhash, subject: "", message: postContent }).then(() => {
      ToastAndroid.show('评论成功', ToastAndroid.SHORT);
      setPostContent('');
      renderPage(`thread-${pageData.tid}-${pageData.pagination.current}-1.html`)
    })
  }

  const renderPostItem = ({ item }) => {
    const imageAttachments = item.attachments.filter(item => item.icon.includes('image.gif'));
    const otherAttachments = item.attachments.filter(item => !item.icon.includes('image.gif'));
    const isFirstPost = item.floor === 1;
    return <Pressable onPress={() => handleReplyPress(item)} style={styles.postContainer}>
      <View style={styles.authorContainer}>
        <Image source={{ uri: item.author.avatar }} style={styles.authorAvatar} />
        <View style={styles.authorInfo}>
          <View style={styles.authorNameContainer}>
            <Text style={styles.authorName}>{item.author.name}</Text>
            <View style={styles.authorBadge}>
              <Text style={styles.authorBadgeText}>{item.author.level}</Text>
            </View>
            <Text style={styles.replyNumber}>#{item.floor}</Text>
          </View>
          <Text style={styles.postTime}>{item.date}</Text>
        </View>
      </View>

      {/* 帖子内容 */}
      <View style={styles.postContent}>
        <RenderHtml
          contentWidth={width}
          source={{ html: decodeHtmlEntity(item.content) }}
          tagsStyles={htmlStyles}
          customHTMLElementModels={{
            font: HTMLElementModel.fromCustomModel({
              contentModel: HTMLContentModel.block
            }),
            marquee: HTMLElementModel.fromCustomModel({
              contentModel: HTMLContentModel.block
            }),
            object: HTMLElementModel.fromCustomModel({
              contentModel: HTMLContentModel.block
            }),
            fieldset: HTMLElementModel.fromCustomModel({
              contentModel: HTMLContentModel.block
            }),
            legend: HTMLElementModel.fromCustomModel({
              contentModel: HTMLContentModel.block
            }),
          }}
          renderersProps={{
            a: {
              onPress: (event, href) => handleLinkPress(href)
            },
            img: {
              // enableExperimentalPercentWidth: true,
              // computeImagesMaxWidth: 150,
              onPress: (event, src) => {
                console.log('img onPress', src)
                if (src.includes('attachments/')) {
                  handleLinkPress(src);
                }
              }
            }
          }}
          baseStyle={{ fontSize: 16, lineHeight: 24, color: '#374151' }}
          defaultViewProps={{ style: { marginVertical: 8 } }}
        />
      </View>
      {item.attachments.length > 0 && (
        <View style={styles.attachmentContainer}>
          <Text style={styles.attachmentTitle}>附件</Text>
          {/* 图片附件轮播图 */}
          {imageAttachments.length > 0 && cookies.cdb3_auth?.value && (
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
                    onPress={() => handleLinkPress(item.url || item.link, item.name)}
                    onLongPress={() => downloadFile(item.url || item.link, item.name)}
                  >
                    <Image
                      source={{
                        uri: item.url || item.link,
                        headers: {
                          'User-Agent': userAgent,
                          'Cookie': `cdb3_auth=${cookies.cdb3_auth.value};`,
                        }
                      }}
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
          {otherAttachments.length > 0 && <FlatList
            data={otherAttachments}
            keyExtractor={(item) => item.name}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                style={styles.attachmentItem}
                onPress={() => downloadFile(item.url || item.link, item.name)}
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
          />}
        </View>
      )}
      {item.legend.length > 0 && (
        <View style={styles.rateContainer}>
          <Text style={styles.rateTitle}>评分</Text>
          {item.legend.map((item, index) => (
            <View key={index} style={styles.rateItem}>
              <Icon name="trophy" size={14} color="#f7ba2a" style={styles.rateIcon} />
              <Text style={styles.rateText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
      {/* 帖子数据 */}
      {isFirstPost ?
        <View style={styles.postStats}>
          {item.thanks > 0 && <>
            <View style={styles.statItem}>
              <Icon name="heart" size={12} color="#FF0000" style={styles.statIcon} />
              <Text style={styles.statText}>{item.thanks} 感谢</Text>
            </View>
            <Text style={styles.statDivider}>|</Text>
          </>}
          <View style={styles.statItem}>
            <Icon name="comment-o" size={14} color="#6B7280" style={styles.statIcon} />
            <Text style={styles.statText}>{(pageData?.pagination?.total || pageData.posts.length) - 1} 回复</Text>
          </View>
        </View>
        :
        <View style={styles.replyFooter}>
          <View style={styles.replyActions}>
            <Pressable style={styles.replyAction} onPress={() => {
              setReplyTitle(`回复 ${item.floor}楼 的帖子`);
              setReplyModalVisible(true)
            }}>
              <Icon name="comment-o" size={14} color="#6B7280" style={styles.actionIcon} />
              <Text style={styles.actionText}>回复</Text>
            </Pressable>
          </View>
        </View>
      }
    </Pressable>
  };

  if (!pageData) {
    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 主要内容区域 */}
      <ScrollView style={styles.scrollView} ref={view => scrollViewRef.current = view}>
        {/* 回复列表 */}
        <FlatList
          data={pageData.posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.pid}
          scrollEnabled={false}
          style={styles.postList}
        />

        {pageData.pagination && <View style={styles.pageContainer}>
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
            value={postContent}
            onChangeText={setPostContent}
            multiline={true}
            numberOfLines={4}
          />
        </View>
        <Pressable style={styles.sendButton} onPress={handlePostPress}>
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
            source={{
              uri: currentImage,
              headers: {
                'User-Agent': userAgent,
                'Cookie': `cdb3_auth=${cookies.cdb3_auth.value};`,
              }
            }}
            style={styles.imageViewerImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
      {/* 回复模态框 */}
      <ReplyModal
        visible={replyModalVisible}
        onClose={() => setReplyModalVisible(false)}
        onSend={(content) => {
          if (!content) {
            ToastAndroid.show('内容不能为空', ToastAndroid.SHORT);
            return
          }
          // 这里处理发送回复的逻辑
          if (/回复\s\d+楼\s的帖子/.test(replyTitle)) {
            threadAction({ action: 'reply', href: pageData.replyUrl, formhash: pageData.formhash, subject: "", message: content }).then(() => {
              ToastAndroid.show('回复成功', ToastAndroid.SHORT);
              setReplyTitle('');
              renderPage(`thread-${pageData.tid}-${pageData.pagination.current}-1.html`)
            })
          } else {
            // 私信
            const msgto = replyTitle.split('私信给:')[1];
            messageAction({ action: 'send', data: { formhash: pageData.formhash, pmsubmit: pageData.formhash, msgto, subject: '', message: content } }).then(() => {
              ToastAndroid.show('发送成功', ToastAndroid.SHORT);
              setReplyTitle('');
            })
          }
        }}
        title={replyTitle}
      />
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
    maxWidth: 350,
    width: 'auto',
    height: 'auto',
    alignSelf: 'center',
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
    paddingRight: 12,
  },
  starButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  messageButton: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    marginRight: 'auto',
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
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
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
  postList: {
    marginTop: 8,
  },
  replyFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 12,
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
