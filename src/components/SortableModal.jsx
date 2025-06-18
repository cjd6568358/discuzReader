import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Vibration
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const SortableModal = ({ visible, onClose, data, onSortEnd, title = '排序' }) => {
  const [modalVisible, setModalVisible] = useState(visible);
  const [items, setItems] = useState(data || []);
  const slideAnim = useState(new Animated.Value(width))[0];

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
        toValue: width,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    setItems(data || []);
  }, [data]);

  const handleDragEnd = ({ data }) => {
    setItems(data);
  };

  const handleSave = () => {
    if (onSortEnd) {
      onSortEnd(items);
    }
    onClose();
  };

  const renderDraggableItem = ({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={() => {
            Vibration.vibrate(50);
            drag();
          }}
          disabled={isActive}
          style={[styles.itemContainer, isActive && styles.activeItem]}
          delayLongPress={200}
        >
          <View style={styles.itemContent}>
            <Icon name="bars" size={16} color="#6B7280" style={styles.dragHandle} />
            <Text style={styles.itemText}>{item.name}</Text>
          </View>
        </Pressable>
      </ScaleDecorator>
    );
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
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.content}>
            <GestureHandlerRootView style={styles.listContainer}>
              <DraggableFlatList
                data={items}
                renderItem={renderDraggableItem}
                keyExtractor={(item) => item.name}
                onDragEnd={handleDragEnd}
                contentContainerStyle={styles.list}
              />
            </GestureHandlerRootView>
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
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
    position: 'absolute',
    top: 0,
    right: 0,
    width: '80%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'column'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  content: {
    flex: 1,
    paddingVertical: 8
  },
  instruction: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center'
  },
  listContainer: {
    flex: 1
  },
  list: {
    paddingVertical: 8
  },
  itemContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  activeItem: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  itemContent: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  itemText: {
    fontSize: 14,
    color: '#1F2937'
  },
  dragHandle: {
    padding: 4
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500'
  }
});

export default SortableModal;