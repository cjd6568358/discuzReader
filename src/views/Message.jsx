import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import ActionSheet from '../components/ActionSheet';
import { useLoading } from '../components/Loading';
import { getPMPage, getPMSentPage, getSpacePage, getProfilePage, messageAction } from '../utils/api';

const MessageView = () => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [messages, setMessages] = useState(null);
  const [groupedMessages, setGroupedMessages] = useState([]);
  const [longPressKey, setLongPressKey] = useState(null);
  const [longPressUserName, setLongPressUserName] = useState(null);
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
      if (msg.unread === 1) {
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

  useFocusEffect(
    useCallback(() => {
      !messages && showLoading()
      // getPMSentPage().then(data => {
      //   const pmList = data.pmList || [];
      //   console.log('sent messages:', pmList);
      // })
      getPMPage().then(data => {
        const pmList = data.pmList || [];
        setMessages(pmList);
        setGroupedMessages(aggregateMessages(pmList));
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
    if (cur.unread === 1) {
      acc += 1;
    }
    return acc;
  }, 0)

  const toggleSelect = (index) => {
    setSelectedMessages(prev => {
      const existingIndex = prev.indexOf(index);
      if (existingIndex === -1) {
        return [...prev, index];
      }
      return prev.filter(i => i !== index);
    });
  };

  const deleteSelected = async () => {
    if (selectedMessages.length === 0) return;
    await messageAction({ action: 'batchdelete', id: selectedMessages.map(index => messages[index].id) });
    setMessages(prev => {
      const newMessages = [...prev];
      selectedMessages.sort((a, b) => b - a).forEach(index => {
        newMessages.splice(index, 1);
      });
      return newMessages;
    });
    setSelectedMessages([]);
  };

  const cancelSelected = () => {
    setSelectedMessages([]);
    setBatchMode(false)
  };

  const handleLongPress = (msgId, userName) => {
    setLongPressKey(msgId);
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
              const userMessages = messages.filter(msg => msg.name === longPressUserName);
              await Promise.all(userMessages.map(msg => messageAction({ action: 'delete', id: msg.id })));
              setMessages(prev => {
                const newMessages = prev.filter(msg => msg.name !== longPressUserName);
                setGroupedMessages(aggregateMessages(newMessages));
                return newMessages;
              });
            }
          }
        ]
      );
    } else if (action === 'markunread') {
      await messageAction({ action: 'markunread', id: longPressKey });
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(item => item.id === longPressKey);
        if (index !== -1) {
          newMessages[index].unread = 1;
        }
        setGroupedMessages(aggregateMessages(newMessages));
        return newMessages;
      });
    }
    setLongPressKey(null);
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
      const rightUser = await getProfilePage();
      // 更新本地状态
      setMessages(prev => {
        const newMessages = [...prev];
        loadedMessages.forEach(loadedMsg => {
          const index = newMessages.findIndex(m => m.id === loadedMsg.id);
          if (index !== -1) {
            newMessages[index] = { ...newMessages[index], content: loadedMsg.content, unread: 0 };
          }
        });
        setGroupedMessages(aggregateMessages(newMessages));
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

  const renderMessageItem = ({ item, index }) => {
    const latestMessage = item.messages[0]; // 最新的一条消息
    return (
      <View key={item.userName} style={styles.messageItem}>
        {
          batchMode && <View style={styles.selectContainer}>
            <Pressable
              style={[styles.checkbox, selectedMessages.includes(index) && styles.checkboxSelected]}
              onPress={() => toggleSelect(index)}
            >
              {selectedMessages.includes(index) && (
                <Icon name="check" size={12} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        }
        <Pressable
          style={styles.messageContent}
          onPress={() => navigateToDetail(item)}
          onLongPress={() => handleLongPress(latestMessage.id, item.userName)}
        >
          <View style={styles.messageHeader}>
            <Text style={styles.messageName} numberOfLines={1}>{item.userName}</Text>
            <Text style={styles.messageTime}>{latestMessage.date}</Text>
          </View>
          <Text numberOfLines={1} style={styles.messageTitle}>{latestMessage.title}</Text>
          {item.unreadCount > 0 && <View style={styles.unreadIndicator} />}
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
        {
          batchMode &&
          <>
            <Pressable
              onPress={cancelSelected}
              style={[styles.deleteButton]}
            >
              <Text>取消</Text>
            </Pressable>
            <Pressable
              onPress={deleteSelected}
              style={[styles.deleteButton, !selectedMessages.length && styles.deleteButtonDisabled]}
            >
              <Text style={styles.deleteButtonText}>批量删除</Text>
            </Pressable>
          </>
        }
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
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#EF4444',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
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
  selectContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
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
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    position: 'absolute',
    left: 44,
    top: 10,
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