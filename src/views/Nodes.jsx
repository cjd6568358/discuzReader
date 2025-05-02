import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    FlatList,
    SafeAreaView,
    StatusBar,
    Alert,
    Modal,
    ToastAndroid,
    Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import Icon from 'react-native-vector-icons/FontAwesome';
import { storage } from '../utils/index'
import http from '../utils/http';

const NodesView = () => {
    const navigation = useNavigation();
    const [url, setUrl] = useState('https://1s2s3s.com/');
    const [nodes, setNodes] = useState(() => {
        const storedNodes = storage.getString('nodes');
        return storedNodes ? JSON.parse(storedNodes) : [];
    });
    const [selectedNode, setSelectedNode] = useState(storage.getString('selectedNode'));
    const [loading, setLoading] = useState({});
    const [showDropMenuModal, setShowDropMenuModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newNode, setNewNode] = useState({ name: '', address: '' });
    const headerHeight = useHeaderHeight();
    const [initialHeaderHeight] = useState(headerHeight);
    const abortControllerRef = useRef({});
    const timeoutIdsRef = useRef([]);
    const flatListRef = useRef(null);
    // 组件卸载时的清理函数
    useEffect(() => {
        return () => {
            // 取消所有正在进行的测速请求
            if (Object.keys(abortControllerRef.current).length) {
                Object.values(abortControllerRef.current).forEach(item => item.abort())
            }
            // 清除所有定时器
            timeoutIdsRef.current.forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
            timeoutIdsRef.current = [];
        };
    }, []);
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => <Pressable style={{ padding: 10 }} onPress={() => setShowDropMenuModal(true)} >
                <Icon name="ellipsis-v" size={20} />
            </Pressable>,
        });
    }, [navigation]);
    // 当nodes状态变化时，保存到本地存储
    useEffect(() => {
        storage.set('nodes', JSON.stringify(nodes));
    }, [nodes]);

    useEffect(() => {
        storage.set('selectedNode', selectedNode);
        http.defaults.baseURL = selectedNode;
    }, [selectedNode])

    // 移除加载更多节点的函数

    const handleUpdate = async () => {
        if (!url.trim()) {
            Alert.alert('错误', '请输入有效的订阅地址');
            return;
        }

        try {
            // 显示加载状态
            setLoading(prev => ({ ...prev, update: true }));

            // 获取URL内容
            const response = await fetch(url);
            const html = await response.text();

            // 先提取id=home或id=updateList的区块内容
            const homeBlockRegex = /<ul[^>]*id=["'](home|updateList)["'][^>]*>([\s\S]*?)<\/ul>/gi;
            let blockMatches = [];
            let blockMatch;

            while ((blockMatch = homeBlockRegex.exec(html)) !== null) {
                blockMatches.push(blockMatch[2]);
            }

            // 如果没有找到指定区块，使用整个HTML
            const contentToSearch = blockMatches.length > 0 ? blockMatches.join('') : html;

            // 使用正则表达式提取区块内的超链接和标题
            const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>([^<]*)<\/a>/gi;
            const matches = {};
            let match;

            while ((match = linkRegex.exec(contentToSearch)) !== null) {
                if (match[2] && match[2].includes(':')) {
                    // 提取链接和标题
                    const linkUrl = match[2];
                    const linkTitle = match[3].trim();
                    if (nodes.some(node => node.url === linkUrl)) {
                        return
                    }
                    matches[linkUrl] = linkTitle || `未命名链接 ${Object.keys(matches).length + 1}`;
                }
            }
            if (Object.keys(matches).length === 0) {
                ToastAndroid.show('未在订阅内容中找到有效的代理节点链接', ToastAndroid.SHORT);
                return;
            }
            // 将提取的链接转换为代理节点格式
            const newNodes = Object.entries(matches).map(([url, title]) => {
                return {
                    title,
                    url,
                    latency: '-'
                };
            });

            // 更新节点列表
            setNodes(prev => [...prev, ...newNodes]);
            ToastAndroid.show(`已添加 ${newNodes.length} 个代理节点`, ToastAndroid.SHORT);
        } catch (error) {
            console.error('更新订阅出错:', error);
            ToastAndroid.show('获取订阅内容失败，请检查网址是否正确', ToastAndroid.SHORT);
        } finally {
            // 隐藏加载状态
            setLoading(prev => ({ ...prev, update: false }));
        }
    };

    const handleTest = async (url) => {
        // 设置加载状态
        setLoading(prev => ({ ...prev, [url]: true }));

        // 如果存在之前的AbortController，先取消它
        if (abortControllerRef.current?.[url]) {
            abortControllerRef.current[url].abort();
        }
        // 创建新的AbortController
        abortControllerRef.current[url] = new AbortController();

        try {
            // 格式化URL，确保它是有效的
            let testUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                testUrl = 'http://' + url;
            }

            // 执行2次测速
            const testResults = [];
            for (let i = 0; i < 2; i++) {
                try {
                    // 记录开始时间
                    const startTime = Date.now();

                    // 设置超时控制
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('请求超时')), 5000);
                    });

                    // 发送请求并计时
                    const fetchPromise = fetch(testUrl + '/bbs/index.php', {
                        method: 'GET',
                        signal: abortControllerRef.current[url].signal
                    });

                    // 使用Promise.race来实现超时控制
                    await Promise.race([fetchPromise, timeoutPromise]);

                    // 计算响应时间并添加到结果数组
                    const responseTime = Date.now() - startTime;
                    testResults.push(responseTime);

                    // 在测试之间添加短暂延迟
                    if (i < 1) {
                        await new Promise(resolve => {
                            const timeoutId = setTimeout(resolve, 500);
                            timeoutIdsRef.current.push(timeoutId);
                        });
                    }
                } catch (error) {
                    console.error(`第${i + 1}次测速失败:`, error);
                    throw error; // 抛出错误以中断测试
                }
            }

            // 计算平均延迟时间
            const averageLatency = Math.round(testResults.reduce((a, b) => a + b, 0) / testResults.length);

            // 更新节点延迟信息
            setNodes(prev => prev.map(node => {
                if (node.url === url) {
                    return {
                        ...node,
                        latency: averageLatency + 'ms'
                    };
                }
                return node;
            }));
        } catch (error) {
            console.error('测速失败:', error);
            // 更新节点延迟为异常标识
            setNodes(prev => prev.map(node => {
                if (node.url === url) {
                    return {
                        ...node,
                        latency: '异常'
                    };
                }
                return node;
            }));
        } finally {
            // 无论成功或失败，都需要重置加载状态
            setLoading(prev => ({ ...prev, [url]: false }));
            delete abortControllerRef.current[url]
        }
    };

    const handleDelete = (url) => {
        // 直接删除并显示Toast提示
        setNodes(prev => prev.filter(node => node.url !== url));
        ToastAndroid.show('已删除节点', ToastAndroid.SHORT);
    };

    // 批量测试函数，每次最多测试3个节点，并添加更多延迟以减轻负载
    const handleBatchTest = async (nodeList) => {
        // 如果没有节点，直接返回
        if (nodeList.length === 0) {
            ToastAndroid.show('没有节点可测试', ToastAndroid.SHORT);
            return;
        }

        // 将节点列表分组，每组最多5个，减少并发请求数量
        const batchSize = 5;
        const batches = [];
        for (let i = 0; i < nodeList.length; i += batchSize) {
            batches.push(nodeList.slice(i, i + batchSize));
        }

        // 显示开始测试的提示
        ToastAndroid.show(`开始测试，共 ${nodeList.length} 个节点`, ToastAndroid.SHORT);

        // 逐批测试
        for (let i = 0; i < batches.length; i++) {
            const currentBatch = batches[i];

            // 并行测试当前批次的所有节点
            const testPromises = currentBatch.map(node => handleTest(node.url));
            await Promise.all(testPromises);

            // 如果不是最后一批，添加一个更长的延迟再测试下一批
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 显示测试完成的提示
        ToastAndroid.show('所有节点测试完成', ToastAndroid.SHORT);
    };

    // 使用useCallback优化函数引用稳定性
    const handleTestCallback = useCallback((url) => {
        handleTest(url);
    }, []);

    const handleDeleteCallback = useCallback((url) => {
        handleDelete(url);
    }, []);

    const handleAdd = () => {
        // 注意：Alert.prompt 在 Android 上不可用，这里仅作为示例
        // 实际应用中应使用 Modal 或第三方库实现输入对话框
        setShowAddModal(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
            {/* 主内容区域 */}
            <View style={styles.container}>
                {/* 输入区域 */}
                <View style={styles.inputSection}>
                    <View style={styles.urlInputContainer}>
                        <View style={styles.inputWrapper}>
                            <Icon name="link" size={16} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                value={url}
                                onChangeText={setUrl}
                                placeholder="请输入订阅地址"
                                style={styles.input}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                        <Pressable
                            style={styles.updateButton}
                            onPress={handleUpdate}
                        >
                            {loading.update ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Icon name="refresh" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                            )}
                            <Text style={styles.buttonText}>更新</Text>
                        </Pressable>
                    </View>

                    <Pressable
                        style={styles.addButton}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Icon name="plus" size={16} color="#6B7280" style={styles.buttonIcon} />
                        <Text style={styles.addButtonText}>手动添加节点</Text>
                    </Pressable>
                </View>

                {/* 节点列表 */}
                {nodes.length > 0 ? (
                    <FlatList
                        ref={flatListRef}
                        data={nodes}
                        keyExtractor={(item) => item.url}
                        renderItem={({ item }) => (
                            <NodeItem
                                node={item}
                                isSelected={selectedNode === item.url}
                                onSelect={() => setSelectedNode(selectedNode === item.url ? '' : item.url)}
                                onTest={handleTestCallback}
                                onDelete={handleDeleteCallback}
                                loading={loading[item.url]}
                            />
                        )}
                        style={styles.nodesList}
                        initialNumToRender={10}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                        removeClippedSubviews={true}
                        updateCellsBatchingPeriod={50}
                        getItemLayout={(data, index) => (
                            { length: 100, offset: 100 * index, index }
                        )}

                        ListEmptyComponent={<Text style={styles.emptyText}>暂无节点，请添加或更新订阅</Text>}

                    />
                ) : null}
            </View>

            {/* 添加节点模态框 */}
            <Modal
                visible={showAddModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>手动添加节点</Text>

                        <View style={styles.modalForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>节点名称</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="请输入节点名称"
                                    placeholderTextColor="#9CA3AF"
                                    value={newNode.name}
                                    onChangeText={(text) => setNewNode(prev => ({ ...prev, name: text }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>节点地址</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="host:port"
                                    placeholderTextColor="#9CA3AF"
                                    value={newNode.address}
                                    onChangeText={(text) => setNewNode(prev => ({ ...prev, address: text }))}
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <Pressable
                                    style={styles.cancelButton}
                                    onPress={() => setShowAddModal(false)}
                                >
                                    <Text style={styles.cancelButtonText}>取消</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.confirmButton}
                                    onPress={() => {
                                        if (newNode.name && newNode.address) {
                                            setNodes(prev => [...prev, {
                                                title: newNode.name,
                                                url: newNode.address,
                                                latency: '-'
                                            }]);
                                            setShowAddModal(false);
                                            setNewNode({ name: '', address: '' });
                                        }
                                    }}
                                >
                                    <Text style={styles.confirmButtonText}>确认添加</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={showDropMenuModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDropMenuModal(false)}
            >
                <Pressable style={{ flex: 1 }} onPress={() => setShowDropMenuModal(false)}>
                    <View style={[styles.dropMenuModalOverlay, { top: initialHeaderHeight }]}>
                        <Pressable
                            android_ripple={{ color: '#9CA3AF' }}
                            style={styles.dropMenuItemButton}
                            onPress={() => {
                                setShowDropMenuModal(false);
                                // 删除所有状态为"异常"的节点
                                const validNodes = nodes.filter(node => node.latency !== '异常');
                                const removedCount = nodes.length - validNodes.length;
                                setNodes(validNodes);
                                ToastAndroid.show(`已删除 ${removedCount} 个无效节点`, ToastAndroid.SHORT);
                            }}
                        >
                            <Text style={styles.dropMenuItem}>删除无效节点</Text>
                        </Pressable>
                        <Pressable
                            android_ripple={{ color: '#9CA3AF' }}
                            style={styles.dropMenuItemButton}
                            onPress={() => {
                                setShowDropMenuModal(false);
                                // 确认是否删除全部节点
                                if (nodes.length > 0) {
                                    Alert.alert(
                                        '确认删除',
                                        '确定要删除全部节点吗？此操作不可恢复。',
                                        [
                                            {
                                                text: '取消',
                                                style: 'cancel'
                                            },
                                            {
                                                text: '确定删除',
                                                onPress: () => {
                                                    setNodes([]);
                                                    ToastAndroid.show('已删除全部节点', ToastAndroid.SHORT);
                                                },
                                                style: 'destructive'
                                            }
                                        ]
                                    );
                                } else {
                                    ToastAndroid.show('没有节点可删除', ToastAndroid.SHORT);
                                }
                            }}
                        >
                            <Text style={styles.dropMenuItem}>删除全部节点</Text>
                        </Pressable>
                        <Pressable
                            android_ripple={{ color: '#9CA3AF' }}
                            style={styles.dropMenuItemButton}
                            onPress={() => {
                                setShowDropMenuModal(false);
                                const newNodes = nodes.map(node => ({ ...node, latency: '-' }));
                                setNodes(newNodes)
                                // 测试所有节点，每次最多测试5个
                                handleBatchTest(newNodes);
                            }}
                        >
                            <Text style={styles.dropMenuItem}>测试全部节点</Text>
                        </Pressable>
                        <Pressable
                            android_ripple={{ color: '#9CA3AF' }}
                            style={styles.dropMenuItemButton}
                            onPress={() => {
                                setShowDropMenuModal(false);
                                // 按测试结果排序
                                const sortedNodes = [...nodes].sort((a, b) => {
                                    // 处理未测试的节点（latency为'-'）
                                    if (a.latency === '-' && b.latency !== '-') return 1; // 未测试的排在后面
                                    if (a.latency !== '-' && b.latency === '-') return -1; // 已测试的排在前面

                                    // 首先将正常节点排在异常节点前面
                                    if (a.latency !== '异常' && b.latency === '异常') return -1;
                                    if (a.latency === '异常' && b.latency !== '异常') return 1;

                                    // 如果两个节点状态相同且都是正常（非'-'和非'异常'），按延迟时间排序
                                    if (a.latency !== '异常' && b.latency !== '异常' &&
                                        a.latency !== '-' && b.latency !== '-') {
                                        const latencyA = parseInt(a.latency);
                                        const latencyB = parseInt(b.latency);
                                        return latencyA - latencyB; // 从小到大排序
                                    }

                                    // 其他情况保持原有顺序
                                    return 0;
                                });

                                setNodes(sortedNodes);
                                ToastAndroid.show('已按测试结果排序', ToastAndroid.SHORT);
                            }}
                        >
                            <Text style={styles.dropMenuItem}>按测试结果排序</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

// 使用React.memo优化节点组件，避免不必要的重渲染
const NodeItem = memo(({ node, isSelected, onSelect, onTest, onDelete, loading }) => {
    return (
        <Pressable
            style={[styles.nodeCard, isSelected && styles.selectedNodeCard]}
            onPress={onSelect}
        >
            <View style={styles.nodeContent}>
                <View style={styles.nodeInfo}>
                    <Text style={[styles.nodeName, isSelected && styles.selectedNodeText]}>{node.title}</Text>
                    <Text style={[styles.nodeAddress, isSelected && styles.selectedNodeText]}>{node.url}</Text>
                    <View style={styles.statusContainer}>
                        <Text style={[styles.latencyText, node.latency === '异常' ? styles.statusError : styles.statusNormal, isSelected && styles.selectedNodeText]}>{node.latency}</Text>
                    </View>
                </View>
                <View style={styles.nodeActions}>
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            onTest(node.url);
                        }}
                        style={styles.testButton}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#9CA3AF" />
                        ) : (
                            <Icon name="bolt" size={18} color={isSelected ? "#FFFFFF" : "#9CA3AF"} style={styles.buttonIcon} />
                        )}
                    </Pressable>
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            onDelete(node.url);
                        }}
                        style={styles.deleteButton}
                    >
                        <Icon name="trash" size={18} color={isSelected ? "#FFFFFF" : "#9CA3AF"} />
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );
}, (prevProps, nextProps) => {
    // 自定义比较函数，只有在这些属性变化时才重新渲染
    return (
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.loading === nextProps.loading &&
        prevProps.node.title === nextProps.node.title &&
        prevProps.node.url === nextProps.node.url &&
        prevProps.node.latency === nextProps.node.latency
    );
});

const styles = StyleSheet.create({
    // 选中节点的样式
    selectedNodeCard: {
        backgroundColor: '#2563EB',
    },
    selectedNodeText: {
        color: '#FFFFFF',
    },
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 20,
        fontSize: 16,
        padding: 16,
    },
    // 移除分页加载相关样式
    inputSection: {
        padding: 16,
        marginBottom: 8,
    },
    urlInputContainer: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        height: 42,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        color: '#111827',
        fontSize: 14,
    },
    updateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingHorizontal: 16,
        height: 42,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    buttonIcon: {
        marginRight: 6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        height: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    addButtonText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    nodesList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    nodeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        overflow: 'hidden',
    },
    nodeContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    nodeInfo: {
        flex: 1,
    },
    nodeName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 4,
    },
    nodeAddress: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusNormal: {
        color: 'green',
    },
    statusError: {
        color: '#EF4444',
    },
    latencyText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    nodeActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    testButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 64,
        paddingBottom: 32,
    },
    emptyImage: {
        width: 160,
        height: 160,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginBottom: 16,
    },
    emptyAddButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    emptyAddButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 16,
    },
    modalForm: {
        gap: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 4,
    },
    modalInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 8,
    },
    cancelButtonText: {
        color: '#4B5563',
        fontSize: 14,
        fontWeight: '500',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginLeft: 8,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    dropMenuModalOverlay: {
        position: 'absolute',
        right: 2,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    dropMenuItemButton: {
        marginBottom: 4,
    },
    dropMenuItem: {
        fontSize: 14,
        color: '#f5f6f7',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
});

export default NodesView;
