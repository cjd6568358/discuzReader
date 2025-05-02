import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';

const { height } = Dimensions.get('window');

const ActionSheet = ({ visible, onClose, options, cancelText = '取消' }) => {
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useState(new Animated.Value(height))[0];
  
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
        toValue: height,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const handleOptionPress = (option) => {
    if (option.onPress) {
      option.onPress();
    }
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.background} onPress={onClose} />
        <Animated.View 
          style={[
            styles.container, 
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <Pressable
                key={index}
                style={[styles.option, index > 0 && styles.borderTop]}
                onPress={() => handleOptionPress(option)}
              >
                <Text style={[styles.optionText, option.destructive && styles.destructiveText]}>
                  {option.text}
                </Text>
              </Pressable>
            ))}
          </View>
          
          <View style={styles.cancelContainer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
          </View>
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
    backgroundColor: 'transparent',
    width: '100%',
    paddingBottom: 8
  },
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    overflow: 'hidden'
  },
  option: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  borderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5'
  },
  optionText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center'
  },
  destructiveText: {
    color: '#FF3B30'
  },
  cancelContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 8
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center'
  }
});

export default ActionSheet;