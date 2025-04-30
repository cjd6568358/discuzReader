import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getPMPage } from '../utils/api';

const TabBar = ({ currentTab }) => {
  const navigation = useNavigation();
  const [tabs, setTabs] = useState([
    { id: 'Home', name: '首页', icon: 'home' },
    { id: 'Post', name: '发帖', icon: 'plus-circle' },
    { id: 'Message', name: '消息', icon: 'comment', badge: 0 },
    { id: 'Profile', name: '我的', icon: 'user' }
  ])

  const onTabChange = (tabId) => {
    navigation.navigate(tabId);
  };

  useEffect(() => {
    if (currentTab === `Message`) {
      return
    }
    getPMPage().then(data => {
      console.log(data.pmList)
      const bageCount = data.pmList.reduce((acc, cur) => {
        if (cur.unread === 1) {
          acc += 1;
        }
        return acc;
      }, 0)
      setTabs(prevTabs => {
        const newTabs = [...prevTabs];
        newTabs[2].badge = bageCount;
        return newTabs;
      })
    })
  }, [])

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <Pressable
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
            {tab.name}{currentTab !== `Message` && tab.badge > 0 && `(${tab.badge})`}
          </Text>
        </Pressable>
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