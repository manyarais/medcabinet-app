import { WebView } from 'react-native-webview';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const PILLIO_URL = 'http://172.20.10.4:3000'; // Evan's laptop on the "Iphone 9" hotspot (scanner is .3, cabinet is .2)

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#cfe0dd' }} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <WebView
          source={{ uri: PILLIO_URL }}
          style={{ flex: 1 }}
          originWhitelist={[PILLIO_URL]}
          javaScriptEnabled
          domStorageEnabled
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
