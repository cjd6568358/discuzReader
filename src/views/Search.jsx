import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import { useLoading } from '../components/Loading';
import { getSearchPage } from '../utils/api';
import http from '../utils/http';

const SearchView = ({ route }) => {
  const { showLoading, hideLoading } = useLoading();
  const navigation = useNavigation();
  const [formhash, setFormhash] = useState('');
  const [srchtxt, setSrchtxt] = useState('');
  const [srchuname, setSrchuname] = useState('');
  const [srchfilter, setSrchfilter] = useState('all');
  const [srchfrom, setSrchfrom] = useState(0);
  const [before, setBefore] = useState('');
  const [orderby, setOrderby] = useState('lastpost');
  const [ascdesc, setAscdesc] = useState('desc');
  useEffect(() => {
    if (route.params?.srchuname) {
      setSrchuname(route.params.srchuname);
    }
    getSearchPage().then(data => {
      setFormhash(data.formhash);
    })
  }, [])

  const srchfilterOptions = [
    { label: '全部主题', value: 'all' },
    { label: '精华主题', value: 'digest' },
    { label: '置顶主题', value: 'top' },
  ];

  const srchfromOptions = [
    { label: '全部', value: 0 },
    { label: '1天', value: 86400 },
    { label: '2天', value: 172800 },
    { label: '1 周', value: 432000 },
    { label: '1 个月', value: 1296000 },
    { label: '3 个月', value: 5184000 },
    { label: '6 个月', value: 8640000 },
    { label: '1 年', value: 31536000 }
  ];

  const beforeOptions = [
    { label: '以内', value: '' },
    { label: '以前', value: 1 },
  ]

  const orderbyOptions = [
    { label: '回复时间', value: 'lastpost' },
    { label: '发布时间', value: 'dateline' },
    { label: '回复数量', value: 'replies' },
    { label: '浏览次数', value: 'views' }
  ];

  const ascdescOptions = [
    { label: '降序', value: 'desc' },
    { label: '升序', value: 'asc' },
  ]

  const handleReset = () => {
    setSrchtxt('');
    setSrchuname('');
    setSrchfilter('all');
    setSrchfrom(0);
    setBefore('');
    setOrderby('lastpost');
    setAscdesc('desc');
  };

  const handleSearch = () => {
    showLoading()
    http.post('search.php', {
      formhash: formhash,
      srchtxt: srchtxt,
      srchuname: srchuname,
      srchfilter: srchfilter,
      srchfrom: srchfrom,
      before: before,
      orderby: orderby,
      ascdesc: ascdesc,
      'srchfid%5B%5D': 'all',
      srchtype: 'title',
      searchsubmit: 'true',
      srchtypeid: '',
    }).then(res => {
      hideLoading()
      navigation.navigate('Forum', {
        href: res.request.responseURL,
      })
    }).catch(err => {
      console.log(err);
      hideLoading()
    })
  };

  const renderOptionButtons = (items, selectedValue, onSelect) => {
    return items.map((item, index) => (
      <Pressable
        key={index}
        style={[styles.optionButton, selectedValue === item.value && styles.selectedButton]}
        onPress={() => onSelect(item.value)}
      >
        <Text style={[styles.optionButtonText, selectedValue === item.value && styles.selectedButtonText]}>
          {item.label}
        </Text>
      </Pressable>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 主体内容 */}
      <ScrollView style={styles.content}>
        {/* 基础搜索 */}
        <View style={styles.basicSearchContainer}>
          <View style={styles.inputContainer}>
            <Icon name="search" size={16} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={srchtxt}
              onChangeText={setSrchtxt}
              style={styles.input}
              placeholder="输入关键词搜索"
              placeholderTextColor="#9CA3AF"
            />
            {srchtxt ? (
              <Pressable onPress={() => setSrchtxt('')}>
                <Icon name="times-circle" size={16} color="#9CA3AF" style={styles.clearIcon} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Icon name="user" size={16} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={srchuname}
              onChangeText={setSrchuname}
              style={styles.input}
              placeholder="输入用户名搜索"
              placeholderTextColor="#9CA3AF"
            />
            {srchuname ? (
              <Pressable onPress={() => setSrchuname('')}>
                <Icon name="times-circle" size={16} color="#9CA3AF" style={styles.clearIcon} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* 高级搜索选项 */}
        <View style={styles.advancedOptionsContainer}>

          {/* 主题范围 */}
          <View style={styles.optionSection}>
            <Text style={styles.optionTitle}>主题范围</Text>
            <View style={styles.optionButtonsGrid}>
              {renderOptionButtons(srchfilterOptions, srchfilter, setSrchfilter)}
            </View>
          </View>

          {/* 搜索时间 */}
          <View style={styles.optionSection}>
            <Text style={styles.optionTitle}>搜索时间</Text>
            <View style={styles.optionButtonsGrid}>
              <View style={styles.pickContainer} >
                <Picker
                  style={{ marginVertical: -10 }}
                  selectedValue={srchfrom}
                  onValueChange={setSrchfrom}>
                  {
                    srchfromOptions.map(option => <Picker.Item key={option.value} label={option.label} value={option.value} />)
                  }
                </Picker>
              </View>
              {renderOptionButtons(beforeOptions, before, setBefore)}
            </View>
          </View>

          {/* 排序方式 */}
          <View style={styles.optionSection}>
            <Text style={styles.optionTitle}>排序方式</Text>
            <View style={styles.optionButtonsGrid}>
              <View style={styles.pickContainer} >
                <Picker
                  style={{ marginVertical: -10 }}
                  selectedValue={orderby}
                  onValueChange={setOrderby}>
                  {
                    orderbyOptions.map(option => <Picker.Item key={option.value} label={option.label} value={option.value} />)
                  }
                </Picker>
              </View>
              {renderOptionButtons(ascdescOptions, ascdesc, setAscdesc)}
            </View>
          </View>

        </View>

        {/* 搜索按钮 */}
        <View style={styles.searchButtonContainer}>
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>重置</Text>
          </Pressable>
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>确定</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  navbar: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    zIndex: 50,
  },
  navbarContent: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navbarTitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  basicSearchContainer: {
    gap: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1F2937',
  },
  clearIcon: {
    marginLeft: 8,
  },
  advancedOptionsContainer: {
    marginTop: 12,
    gap: 12,
  },
  optionSection: {
    gap: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  optionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: -4,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  selectedButton: {
    backgroundColor: '#2563EB',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedButtonText: {
    color: '#FFFFFF',
  },
  searchButtonContainer: {
    marginTop: 32,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 32,
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  pickContainer: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
});

export default SearchView;
