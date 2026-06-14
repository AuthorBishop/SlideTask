import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';

import '../global.css';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

const FONT_TIMEOUT_MS = 8000;

const RootLayout: React.FC = () => {
  const [fontsLoaded, fontError] = useFonts({
    'Glow Sans SC': { uri: 'https://resource-static.cdn.bcebos.com/fonts/GlowSansSC-Normal-Regular.ttf' },
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const timer = setTimeout(() => {
      console.warn('[Font] 字体加载超时，使用系统字体回退');
      setTimedOut(true);
    }, FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && !timedOut) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#6366F1" />
        <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 13 }}>加载中...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
      </Stack>
      <PortalHost />
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(RootLayout);
