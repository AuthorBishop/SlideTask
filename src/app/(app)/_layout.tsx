import { Stack } from 'expo-router';
import { FontSizeProvider } from '@/ctx/fontSize';

export default function AppLayout() {
  return (
    <FontSizeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task" />
        <Stack.Screen
          name="completed"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
    </FontSizeProvider>
  );
}
