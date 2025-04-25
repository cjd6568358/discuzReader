import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const tabs = [
  { id: 'Home', name: '首页', icon: 'home' },
  { id: 'Post', name: '发帖', icon: 'plus-circle' },
  { id: 'Message', name: '消息', icon: 'comment' },
  { id: 'Profile', name: '我的', icon: 'user' }
];
const TabBar = ({ currentTab }) => {
  const navigation = useNavigation();

  const onTabChange = (tabId) => {
    navigation.navigate(tabId);
  };

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabItem}
          onPress={() => onTabChange(tab.id)}
        >
          <Icon 
            name={tab.icon} 
            size={20} 
            color={currentTab === tab.id ? '#2563EB' : '#6B7280'} 
          />
          <Text 
            style={[
              styles.tabText, 
              { color: currentTab === tab.id ? '#2563EB' : '#6B7280' }
            ]}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 4,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default TabBar;