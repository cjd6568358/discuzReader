import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import TabBar from '../components/TabBar';
import ActionSheet from '../components/ActionSheet';
import ReplyModal from '../components/ReplyModal';
import { useLoading } from '../components/Loading';
import { getPMPage, messageAction } from '../utils/api';

const MessageView = () => {
  const { showLoading, hideLoading } = useLoading();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]); // 存储选中的消息索引
  const [batchMode, setBatchMode] = useState(false)
  const [messages, setMessages] = useState([]);
  const [longPressKey, setLongPressKey] = useState(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyTitle, setReplyTitle] = useState('');
  const actionSheetOptions = [
    { text: '回复', onPress: () => handleActionSheetItemPress('reply') },
    { text: '标为未读', onPress: () => handleActionSheetItemPress('markunread') },
    { text: '删除', destructive: true, onPress: handleActionSheetItemPress('delete') },
    { text: '批量删除', destructive: true, onPress: () => handleActionSheetItemPress('batchDelete') }
  ];

  useEffect(() => {
    showLoading()
    getPMPage().then(data => {
      console.log(data.pmList)
      setMessages(data.pmList)
      hideLoading()
    })
  }, [])

  const badgeCount = messages.reduce((acc, cur) => {
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

  const toggleMessage = (index) => {
    if (messages[index].expanded === true || Reflect.has(messages[index], 'content')) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[index].expanded = !newMessages[index].expanded;
        return newMessages;
      });
    } else {
      showLoading()
      messageAction({ action: 'view', id: messages[index].id }).then(content => {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[index].expanded = !newMessages[index].expanded;
          newMessages[index].content = content;
          return newMessages;
        });
        hideLoading()
      })
    }
  };

  const handleLongPress = (key) => {
    setLongPressKey(key);
    setActionSheetVisible(true)
  };

  const handleActionSheetItemPress = async (action) => {
    if (action === 'batchDelete') {
      setBatchMode(true);
    } else if (action === 'delete') {
      await messageAction({ action: 'delete', id: longPressKey });
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(item => item.id === key);
        if (index !== -1) {
          newMessages.splice(index, 1);
        }
        return newMessages;
      });
    } else if (action === 'markunread') {
      await messageAction({ action: 'markunread', id: longPressKey });
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(item => item.id === key);
        newMessages[index].unread = 1;
        return newMessages;
      });
    } else if (action === 'reply') {
      const messageIndex = messages.findIndex(item => item.id === longPressKey);
      if (messageIndex !== -1) {
        setReplyTitle('Re: ' + messages[messageIndex].title);
        setReplyModalVisible(true);
      }
    }
    if (action !== 'reply') {
      setLongPressKey(null)
    }
  }

  const renderMessageItem = ({ item, index }) => (
    <View key={item.id} style={styles.messageItem}>
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
      <Pressable style={styles.messageContent} onPress={() => toggleMessage(index)} onLongPress={() => handleLongPress(item.id)} >
        <View style={styles.messageHeader}>
          <View style={{ flex: 1, marginRight: 8 }} >
            <Text numberOfLines={2} style={styles.messageName}>{item.title}</Text>
          </View>
          <Text style={styles.messageTime}>{item.date}</Text>
        </View>
        {item.expanded && <Text style={styles.messageText} ellipsizeMode="tail" >
          {item.content}
        </Text>}
        {item.expanded && (
          <View style={styles.collapseButtonContainer}>
            <Text>来自：{item.from}</Text>
            <Pressable
              onPress={() => toggleMessage(index)}
              style={styles.collapseButton}
            >
              <Text style={styles.collapseButtonText}>收起</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
      {item.unread === 1 && <View style={styles.unreadIndicator} />}
    </View>
  );

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
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={renderEmptyState}
      />
      <ActionSheet
        visible={actionSheetVisible}
        options={actionSheetOptions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="取消"
      />
      {/* 回复模态框 */}
      <ReplyModal
        visible={replyModalVisible}
        onClose={() => { setReplyModalVisible(false); setLongPressKey(null) }}
        onSend={(content) => {
          // 这里处理发送回复的逻辑
          const messageIndex = messages.findIndex(item => item.id === longPressKey);
          if (messageIndex !== -1) {
            messageAction({ action: 'send', data: { formhash: '24cbfa84', pmsubmit: '24cbfa84', msgto: messages[messageIndex].from, subject: replyTitle, message: content } });
          }
        }}
        title={replyTitle}
        placeholder="请输入回复内容"
      />
      {/* 底部导航栏 */}
      <TabBar currentTab="Message" />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 4,
  },
  messageName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  messageTime: {
    flexShrink: 0,
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  collapseButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  collapseButton: {
    padding: 4,
  },
  collapseButtonText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
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