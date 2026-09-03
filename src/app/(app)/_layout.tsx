import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { FontSizeProvider } from '@/ctx/fontSize';
import { ConfirmProvider } from '@/ctx/confirm';
import { SettingsProvider } from '@/ctx/settings';
import { preloadSounds } from '@/utils/sounds';
import { ensureIdentity } from '@/lib/analytics';

export default function AppLayout() {
  // 启动即预热音频（预下载 + 建播放器），消除首响滞后
  useEffect(() => {
    preloadSounds();
    // 首次启动生成匿名 ID 与安装时间（留存统计的锚点，已存在不覆盖）
    ensureIdentity().catch((e) => console.error('初始化匿名身份失败', e));
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
            <Stack.Screen name="pick" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </ConfirmProvider>
      </FontSizeProvider>
    </SettingsProvider>
  );
}
