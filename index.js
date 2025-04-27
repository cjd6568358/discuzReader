/**
 * @format
 */
import { AppRegistry } from 'react-native';
import { storage } from './src/utils/index';
import { createAppNavigation } from './src/router';
import { name as appName } from './app.json';

const selectedNode = storage.getString('selectedNode');
const App = createAppNavigation({ initialRouteName: selectedNode ? 'Home' : 'Login' });

AppRegistry.registerComponent(appName, () => () => <App />);