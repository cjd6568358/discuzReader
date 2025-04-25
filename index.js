/**
 * @format
 */
import { AppRegistry } from 'react-native';
import { storage } from './src/utils/index';
import { createAppNavigation } from './src/router';
import { name as appName } from './app.json';

const discuzDomain = storage.getString('discuzDomain');
const App = createAppNavigation({ initialRouteName: discuzDomain ? 'Home' : 'Login' });

AppRegistry.registerComponent(appName, () => () => <App />);