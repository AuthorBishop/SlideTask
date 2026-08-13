import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { FontSizeProvider } from '@/ctx/fontSize';
import { ConfirmProvider } from '@/ctx/confirm';
import { SettingsProvider } from '@/ctx/settings';
import { preloadSounds } from '@/utils/sounds';

export default function AppLayout() {
  // 启动即预热音频（预下载 + 建播放器），消除首响滞后
  useEffect(() => {
    preloadSounds();
  }, []);

  return (
    <SettingsProvider>
      <FontSizeProvider>
        <ConfirmProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="task" />
            <Stack.Screen
              name="completed"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </ConfirmProvider>
      </FontSizeProvider>
    </SettingsProvider>
  );
}
