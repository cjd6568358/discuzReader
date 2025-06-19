import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Image, StyleSheet, SafeAreaView, StatusBar, Pressable, ToastAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import iconv from 'iconv-lite'
import { useLoading } from '../components/Loading';
import { getPostPage } from '../utils/api'
import http from '../utils/http';

const PostScreen = ({ route }) => {
  const navigation = useNavigation();
  const { showLoading, hideLoading } = useLoading();
  const [selectTypeId, setSelectTypeId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [pageData, setPageData] = useState({});
  const [extraParamValues, setExtraParamValues] = useState({});
  const [readPermission, setReadPermission] = useState('0');

  useEffect(() => {
    showLoading()
    getPostPage(route.params.href).then(data => {
      console.log(data)
      setPageData(data);
    }).finally(() => {
      hideLoading()
    })
  }, [])

  const [uploadedImages, setUploadedImages] = useState([
    'https://ai-public.mastergo.com/ai/img_res/e1c3dfff8c1e0529b9fe1ccdf68c6648.jpg',
    'https://ai-public.mastergo.com/ai/img_res/cc13bab60c818399e31e07686002fb4b.jpg'
  ]);

  const removeImage = (index) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    // 处理取消操作
    navigation.goBack();
  };

  const handlePublish = () => {
    if (selectTypeId && subject && message) {
      // 处理发布操作
      try {
        console.log('subject', iconv.encode(subject, 'GBK'))
        const fd = new FormData()
        fd.append('iconid', 0)
        fd.append('wysiwyg', 0)
        fd.append('posteditor_mediatyperadio', 'on')
        fd.append('formhash', pageData.formhash)
        fd.append('typeid', selectTypeId)
        fd.append('subject', iconv.encode(subject, 'GBK'))
        fd.append('selecttypeid', selectTypeId)
        fd.append('message', iconv.encode(message, 'GBK'))
        fd.append('readperm', readPermission)
        Object.keys(extraParamValues).forEach(key => {
          fd.append(key, extraParamValues[key])
        })
        http.post(pageData.post_action, fd, { skipGBK: true }).then(res => console.log(res)).catch(err => console.log(err))
      } catch (error) {
        console.log(error)
      }
    } else {
      ToastAndroid.show('请填写完整信息', ToastAndroid.SHORT)
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* 顶部导航栏 */}
      <View style={styles.navbar}>
        <Pressable style={styles.navButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>取消</Text>
        </Pressable>
        <Text style={styles.navTitle}>发表主题</Text>
        <Pressable style={styles.navButton} onPress={handlePublish}>
          <Text style={styles.publishText}>发布</Text>
        </Pressable>
      </View>

      {/* 主体内容区 */}
      <ScrollView style={styles.content}>
        {/* 额外参数 */}
        {
          pageData.extra_params?.length > 0 && pageData.extra_params.map(param => <View
            key={param.field}
            style={styles.pickContainer}
          >
            <Picker
              selectedValue={extraParamValues[param.field]}
              onValueChange={(itemValue) =>
                setExtraParamValues({ ...extraParamValues, [param.field + 'select']: itemValue })
              }>
              {
                param.options.map(option => <Picker.Item key={option.value} label={option.label} value={option.value} />)
              }
            </Picker>
          </View>)
        }
        {/* 分类选择 */}
        <View style={styles.pickContainer}>
          <Picker
            selectedValue={selectTypeId}
            onValueChange={setSelectTypeId}>
            {
              pageData.type_options?.map(option => <Picker.Item key={option.value} label={option.label} value={option.value} />)
            }
          </Picker>
        </View>

        {/* 标题输入 */}
        <TextInput
          style={styles.titleInput}
          value={subject}
          onChangeText={setSubject}
          placeholder="请输入标题"
          placeholderTextColor="#9CA3AF"
        />

        {/* 内容编辑区 */}
        <View style={styles.editorContainer}>
          <TextInput
            style={styles.editor}
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="请输入内容"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* 图片预览区 */}
        {/* {uploadedImages.length > 0 && (
          <FlatList
            data={uploadedImages}
            renderItem={renderImageItem}
            keyExtractor={(_, index) => index.toString()}
            numColumns={4}
            style={styles.imageGrid}
            columnWrapperStyle={styles.imageRow}
          />
        )} */}

        {/* 高级选项 */}
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>阅读权限</Text>
          <TextInput
            style={{
              width: 60,
              paddingHorizontal: 8,
              textAlign: 'center',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
            value={readPermission}
            onChangeText={setReadPermission}
            placeholderTextColor="#9CA3AF"
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
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
  publishText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pickContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#111827',
  },
  editorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 200,
  },
  editor: {
    minHeight: 180,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
  },
  imageGrid: {
    marginBottom: 16,
  },
  imageRow: {
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '23%',
    aspectRatio: 1,
    marginBottom: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    marginBottom: 16,
  },
  optionLabel: {
    color: '#4B5563',
    fontSize: 16,
  },
});

export default PostScreen;

