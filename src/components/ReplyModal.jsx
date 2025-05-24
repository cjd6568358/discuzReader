import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';

const ReplyModal = ({
  visible,
  onClose,
  onSend,
  title = '回复',
  placeholder = '请输入内容',
  initialContent = '',
}) => {
  const [modalVisible, setModalVisible] = useState(visible);
  const [content, setContent] = useState(initialContent);
  const slideAnim = useState(new Animated.Value(400))[0];

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        setModalVisible(false);
        setContent(initialContent); // 重置内容
      });
    }
  }, [visible, initialContent]);

  const handleCancel = () => {
    onClose();
  };

  const handleSend = () => {
    if (content.trim() === '') return;
    onSend(content);
    setContent('');
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={modalVisible}
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Pressable 
          style={styles.background} 
          onPress={handleCancel} 
        />
        <Animated.View 
          style={[
            styles.container, 
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* 顶部导航栏 */}
          <View style={styles.navbar}>
            <Pressable style={styles.navButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Text style={styles.navTitle}>{title}</Text>
            <Pressable 
              style={[styles.navButton, content.trim() === '' && styles.disabledButton]} 
              onPress={handleSend}
              disabled={content.trim() === ''}
            >
              <Text style={[styles.sendText, content.trim() === '' && styles.disabledText]}>发送</Text>
            </Pressable>
          </View>

          {/* 主体内容区 */}
          <ScrollView style={styles.content}>

            {/* 内容编辑区 */}
            <View style={styles.editorContainer}>
              <TextInput
                style={styles.editor}
                multiline
                value={content}
                onChangeText={setContent}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                autoFocus={true}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)'
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    width: '100%',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  navButton: {
    padding: 8,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  sendText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
    padding: 16,
    maxHeight: 300,
  },
  editorContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  editor: {
    minHeight: 100,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
  },
});

export default ReplyModal;