/**
 * @format
 */
import { AppRegistry } from 'react-native';
import { storage } from './src/utils/index';
import { createAppNavigation } from './src/router';
import { name as appName } from './app.json';

const currHost = storage.getString('currHost');
const App = createAppNavigation({ initialRouteName: currHost ? 'Home' : 'Login' });

AppRegistry.registerComponent(appName, () => () => <App />);