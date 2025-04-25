import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeView from './views/Home'
import LoginView from './views/Login'

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
            navigationOptions: {
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