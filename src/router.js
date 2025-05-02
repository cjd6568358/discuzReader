import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeView from './views/Home'
import LoginView from './views/Login'
import NodesView from './views/Nodes'
import MessageView from './views/Message'
import ForumView from './views/Forum'
import ThreadView from './views/Thread'
import PostView from './views/Post'
import ProfileView from './views/Profile'
import SearchView from './views/Search'

export const defaultConfig = {
    initialRouteName: 'Home',
    screenOptions: {
        headerShown: false,
    },
    screens: {
        Home: {
            screen: HomeView,
        },
        Message: {
            screen: MessageView,
        },
        Forum: {
            screen: ForumView,
        },
        Thread: {
            screen: ThreadView,
        },
        Post: {
            screen: PostView,
        },
        Profile: {
            screen: ProfileView,
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
                title: '节点配置',
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