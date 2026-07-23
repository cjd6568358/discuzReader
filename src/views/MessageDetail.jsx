import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  TextInput,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useLoading } from '../components/Loading';
import { messageAction } from '../utils/api';
import { storage } from '../utils/index';

const MessageDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const { showLoading, hideLoading } = useLoading();
  const { leftUser, rightUser, messages: initialMessages } = route.params;
  const [messages, setMessages] = useState(initialMessages);
  const [selectedNode] = useState(() => storage.getString('selectedNode'));
  const [inputText, setInputText] = useState('');
  // 删除所有消息
  const handleDeleteAll = () => {
    Alert.alert(
      '确认删除',
      `确定要删除与 ${leftUser.username} 的所有消息吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            showLoading();
            try {
              await messageAction({ action: 'delete', msg: messages });
              navigation.goBack();
            } catch (error) {
              console.log('Failed to delete messages:', error);
            } finally {
              hideLoading();
            }
          }
        }
      ]
    );
  };

  // 删除单条消息
  const handleDeleteOne = (msg) => {
    Alert.alert(
      '确认删除',
      '确定要删除这条消息吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await messageAction({ action: 'delete', msg });
              const updated = messages.filter(m => m.id !== msg.id);
              if (updated.length === 0) {
                navigation.goBack();
              } else {
                setMessages(updated);
              }
            } catch (error) {
              console.log('Failed to delete message:', error);
            }
          }
        }
      ]
    );
  };

  // 发送消息（使用 reply action，自动获取 formhash）
  const handleSend = async () => {
    if (!inputText.trim()) return;
    try {
      // inverted=true 时，messages[0] 是最新消息（显示在底部）
      const latestMessage = messages[0];
      await messageAction({
        action: 'reply',
        data: {
          pmid: latestMessage.id,
          msgto: leftUser.username,
          subject: 'Re: ' + latestMessage.title,
          message: inputText.trim()
        }
      });
      // 发送成功后，添加新消息到列表
      const newMessage = {
        ...latestMessage,
        id: Date.now(), // 临时 ID，实际应由服务器返回
        date: new Date().toISOString(),
        title: 'Re: ' + latestMessage.title,
        type: 'track',
        content: inputText.trim()
      };
      setMessages(prev => [newMessage, ...prev]);
      setInputText('');
    } catch (error) {
      console.log('Failed to send message:', error);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isSelf = item.type === 'track'; // 判断消息是否为自己发送的
    return (
      <View style={[styles.messageItem, isSelf ? styles.selfItem : styles.otherItem]}>
        {!isSelf && (
          <Image
            source={{ uri: `${selectedNode}/bbs/${leftUser.avatar}` }}
            style={styles.avatar}
          />
        )}
        <Pressable
          style={[styles.messageBubble, isSelf ? styles.selfBubble : styles.otherBubble]}
          onLongPress={() => handleDeleteOne(item)}
        >
          <View style={styles.messageHeader}>
            <Text style={styles.messageDate}>{item.date}</Text>
          </View>
          <Text style={styles.messageTitle}>{item.title}</Text>
          {item.content && (
            <View style={styles.messageContent}>
              <RenderHtml
                contentWidth={width - 120}
                source={{ html: item.content }}
                tagsStyles={htmlStyles}
                baseStyle={{ fontSize: 14, color: '#374151', lineHeight: 22 }}
              />
            </View>
          )}
        </Pressable>
        {isSelf && (
          <Image
            source={{ uri: `${selectedNode}/bbs/${rightUser.avatar}` }}
            style={styles.avatar}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      {/* 顶部导航栏 */}
      <View style={styles.navbar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color="#374151" />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {leftUser.username}({leftUser.status})
        </Text>
        <Pressable
          onPress={handleDeleteAll}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>全部删除</Text>
        </Pressable>
      </View>

      {/* 消息列表 */}
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messageList}
        inverted={true}  // 反转列表，使最新消息在底部
      />

      {/* 底部输入框 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <Pressable
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Icon name="send" size={16} color={inputText.trim() ? '#FFFFFF' : '#9CA3AF'} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const htmlStyles = {
  a: {
    color: '#2563EB',
    textDecorationLine: 'none',
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#D1D5DB',
    paddingLeft: 8,
    marginVertical: 4,
    color: '#6B7280',
  },
  strong: {
    fontWeight: '600',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#EF4444',
  },
  messageList: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  selfItem: {
    justifyContent: 'flex-end',
  },
  otherItem: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
  },
  selfBubble: {
    backgroundColor: '#DBEAFE',
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  messageContent: {
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
});

export default MessageDetail;
