import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome';
import HomeView from './views/Home'
import LoginView from './views/Login'
import NodesView from './views/Nodes'
import MessageView from './views/Message'
import ForumView from './views/Forum'
import ThreadView from './views/Thread'
import PostView from './views/PostWebView'
import ProfileView from './views/Profile'
import SearchView from './views/Search'

const TabStack = createBottomTabNavigator()
const HomeTab = () => {
    return <TabStack.Navigator backBehavior="history" screenOptions={{
        headerShown: false,
    }}>
        <TabStack.Screen name="Index" component={HomeView} options={{
            tabBarLabel: '首页',
            tabBarIcon: ({ color }) => (
                <Icon name="home" color={color} size={20} />
            ),
        }} />
        <TabStack.Screen name="Message" component={MessageView} options={{
            tabBarLabel: '消息',
            tabBarIcon: ({ color }) => (
                <Icon name="envelope" color={color} size={20} />
            ),
        }} />
        <TabStack.Screen name="Profile" component={ProfileView} options={{
            tabBarLabel: '我的',
            tabBarIcon: ({ color }) => (
                <Icon name="user" color={color} size={20} />
            ),
        }} />
    </TabStack.Navigator>
}

const Stack = createNativeStackNavigator();

export const RootStack = ({ initialRouteName = 'Home' }) => {
    return <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{
        headerShown: false,
    }}>
        <Stack.Screen name="Home" component={HomeTab} />
        <Stack.Screen name="Forum" component={ForumView} options={{
            headerShown: true,
        }} />
        <Stack.Screen name="Thread" component={ThreadView} options={{
            headerShown: true,
        }} />
        <Stack.Screen name="Post" component={PostView} />
        <Stack.Screen name="Search" component={SearchView} options={{
            headerShown: true,
            headerTitle: '搜索',
        }} />
        <Stack.Screen name="Login" component={LoginView} />
        <Stack.Screen name="Nodes" component={NodesView} options={{
            headerShown: true,
            headerTitle: '节点配置',
        }} />
    </Stack.Navigator>
}
