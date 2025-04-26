import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeView from './views/Home'
import LoginView from './views/Login'
import HostsView from './views/Hosts'

export const defaultConfig = {
    initialRouteName: 'Home',
    screenOptions: {
        headerShown: false,
    },
    screens: {
        Home: {
            screen: HomeView,
        },
        Login: {
            screen: LoginView,
            options: {
            },
        },
        Hosts: {
            screen: HostsView,
            options: {
                title: '站点配置',
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