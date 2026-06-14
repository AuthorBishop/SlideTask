import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../global.css';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

const RootLayout: React.FC = () => {
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
