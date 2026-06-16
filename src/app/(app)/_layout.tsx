import { Stack } from 'expo-router';
import { FontSizeProvider } from '@/ctx/fontSize';
import { ConfirmProvider } from '@/ctx/confirm';

export default function AppLayout() {
  return (
    <FontSizeProvider>
      <ConfirmProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="task" />
          <Stack.Screen
            name="completed"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
      </ConfirmProvider>
    </FontSizeProvider>
  );
}
