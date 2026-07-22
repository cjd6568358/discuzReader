import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ActionSheet from '../components/ActionSheet';
import { useLoading } from '../components/Loading';
import { getPMPage, getPMSentPage, getSpacePage, getProfilePage, messageAction } from '../utils/api';

const MessageView = () => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [messages, setMessages] = useState(null);
  const [longPressUserName, setLongPressUserName] = useState(null);
  const [rightUser, setRightUser] = useState();


  const actionSheetOptions = [
    { text: '删除与该用户所有消息', destructive: true, onPress: () => handleActionSheetItemPress('deleteAll') },
    // { text: '标为未读', onPress: () => handleActionSheetItemPress('markunread') },
  ];

  // 按用户聚合消息
  const aggregateMessages = (messageList) => {
    const grouped = {};

    messageList.forEach(msg => {
      const userName = msg.name;
      if (!grouped[userName]) {
        grouped[userName] = {
          userName,
          uid: msg.uid,
          messages: [],
          unreadCount: 0,
          latestDate: msg.date,
        };
      }
      grouped[userName].messages.push(msg);
      if (msg.unread === 1 && msg.type === 'received') {
        grouped[userName].unreadCount++;
      }
    });

    // 转换为数组并按最新消息排序
    return Object.values(grouped).map(group => ({
      ...group,
      // 保持最新的消息在前面
      messages: group.messages.sort((a, b) => new Date(b.date) - new Date(a.date)),
    })).sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));
  };

  useEffect(() => {
    getProfilePage().then(setRightUser).catch(error => {
      console.log(error);
    });
  }, [])

  useFocusEffect(
    useCallback(() => {
      !messages && showLoading()
      Promise.all([getPMPage(), getPMSentPage()]).then(([receivedMessages = [], sentMessages = []]) => {
        const allMessages = [];
        receivedMessages.forEach(msg => {
          msg.type = 'received'
          allMessages.push(msg);
        });
        sentMessages.forEach(msg => {
          msg.type = 'sent'
          allMessages.push(msg);
        });
        setMessages(allMessages);
      }).catch(error => {
        console.log(error);
        if (error === 'redirect login') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        }
      }).finally(() => {
        hideLoading()
      })
    }, []))

  const badgeCount = (messages || []).reduce((acc, cur) => {
    if (cur.unread === 1 && cur.type === 'received') {
      acc += 1;
    }
    return acc;
  }, 0)

  const handleLongPress = (userName) => {
    setLongPressUserName(userName);
    setActionSheetVisible(true);
  };

  const handleActionSheetItemPress = async (action) => {
    if (action === 'deleteAll') {
      // 删除该用户所有消息（带二次确认）
      Alert.alert(
        '确认删除',
        `确定要删除与 ${longPressUserName} 的所有消息吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: async () => {
              // 这里拿到的是当前用户和该用户的所有消息对话
              const userMessages = groupedMessages.filter(item => item.userName === longPressUserName)[0]?.messages;
              // 如果不行，尝试使用 userMessages.filter(msg => msg.type === 'received')过滤出仅接收到的消息
              await messageAction({ action: 'delete', id: userMessages.map(msg => msg.id) });
              setMessages(prev => prev.filter(msg => msg.name !== longPressUserName));
            }
          }
        ]
      );
    } else if (action === 'markunread') {
      const userMessages = groupedMessages.filter(item => item.userName === longPressUserName)[0]?.messages;
      const latestMessageId = userMessages?.[0]?.id;
      await messageAction({ action: 'markunread', id: latestMessageId });
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(item => item.id === latestMessageId);
        if (index !== -1) {
          newMessages[index].unread = 1;
        }
        return newMessages;
      });
    }
    setLongPressUserName(null);
  };

  // 跳转到消息详情并标记为已读
  const navigateToDetail = async (item) => {
    showLoading();
    try {
      // 加载所有消息内容并标记为已读
      const loadedMessages = await Promise.all(
        item.messages.map(async (msg) => {
          const content = await messageAction({ action: 'view', id: msg.id });
          return { ...msg, content, unread: 0 };
        })
      );
      const leftUser = await getSpacePage(item.uid);
      // 更新本地状态
      setMessages(prev => {
        const newMessages = [...prev];
        loadedMessages.forEach(loadedMsg => {
          const index = newMessages.findIndex(m => m.id === loadedMsg.id);
          if (index !== -1) {
            newMessages[index] = { ...newMessages[index], content: loadedMsg.content, unread: 0 };
          }
        });
        return newMessages;
      });

      navigation.navigate('MessageDetail', {
        leftUser,
        rightUser,
        messages: loadedMessages
      });
    } catch (error) {
      console.log('Failed to load message content:', error);
    } finally {
      hideLoading();
    }
  };

  const groupedMessages = useMemo(() => aggregateMessages(messages || []), [messages]);

  const renderMessageItem = ({ item }) => {
    const latestMessage = item.messages[0]; // 最新的一条消息
    return (
      <View key={item.userName} style={styles.messageItem}>
        <Pressable
          style={styles.messageContent}
          onPress={() => navigateToDetail(item)}
          onLongPress={() => handleLongPress(item.userName)}
        >
          <View style={styles.messageHeader}>
            <Text style={styles.messageName} numberOfLines={1}>{item.userName}</Text>
            <Text style={styles.messageTime}>{latestMessage.date}</Text>
          </View>
          <View style={styles.messageTitleContainer}>
            {item.unreadCount > 0 && <View style={styles.unreadIndicator} />}
            <Text numberOfLines={1} style={styles.messageTitle}>{latestMessage.title}</Text>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>暂无消息</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      {/* 顶部导航栏 */}
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>我的消息{badgeCount > 0 && `(${badgeCount})`}</Text>
      </View>

      {/* 消息列表 */}
      <FlatList
        data={groupedMessages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.userName}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={renderEmptyState}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 2,
    zIndex: 10,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginRight: 'auto'
  },
  messageList: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  messageItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  messageTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default MessageView;