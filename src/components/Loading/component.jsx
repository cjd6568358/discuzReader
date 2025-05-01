import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const Loading = ({ visible, message = '加载中...', duration = 2000, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();

      if (duration > 0) {
        const timer = setTimeout(() => {
          hide();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      if (onHide) onHide();
    });
  };

  // 当不可见时不渲染组件
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  content: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 20,
    minWidth: width * 0.4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  message: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center'
  }
});

export default Loading;