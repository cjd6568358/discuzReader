import { createStaticNavigation } from '@react-navigation/native';
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

const HomeTabs = createBottomTabNavigator({
    screenOptions: {
        headerShown: false,
    },
    backBehavior: "history",
    screens: {
        Home: {
            screen: HomeView,
            options: {
                tabBarLabel: '首页',
                tabBarIcon: ({ color }) => (
                    <Icon name="home" color={color} size={20} />
                ),
            },
        },
        Message: {
            screen: MessageView,
            options: {
                tabBarLabel: '消息',
                tabBarIcon: ({ color }) => (
                    <Icon name="envelope" color={color} size={20} />
                ),
            },
        },
        Profile: {
            screen: ProfileView,
            options: {
                tabBarLabel: '我的',
                tabBarIcon: ({ color }) => (
                    <Icon name="user" color={color} size={20} />
                ),
            },
        },
    },
});

export const defaultConfig = {
    initialRouteName: 'Home',
    screenOptions: {
        headerShown: false,
    },
    screens: {
        Home: {
            screen: HomeTabs,
        },
        // Home: {
        //     screen: HomeView,
        // },
        // Message: {
        //     screen: MessageView,
        // },
        // Profile: {
        //     screen: ProfileView,
        // },
        Forum: {
            screen: ForumView,
            options: {
                headerShown: true,
            },
        },
        Thread: {
            screen: ThreadView,
            options: {
                headerShown: true,
            },
        },
        Post: {
            screen: PostView,
        },
        Search: {
            screen: SearchView,
        },
        Login: {
            screen: LoginView,
            options: {
            },
        },
        Nodes: {
            screen: NodesView,
            options: {
                headerTitle: '节点配置',
                headerShown: true,
                // headerRight: () => <Icon name="ellipsis-v" size={20} />,
            },
        },
    },
}

export const createAppNavigation = (config = {}) => {
    const RootStack = createNativeStackNavigator({
        ...defaultConfig,
        ...config
    });
    return createStaticNavigation(RootStack);
}