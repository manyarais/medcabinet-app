import { WebView } from 'react-native-webview';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const PILLIO_URL = 'http://172.20.10.2:3000'; // keep your working IP

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#cfe0dd' }} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <WebView
          source={{ uri: PILLIO_URL }}
          style={{ flex: 1 }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}