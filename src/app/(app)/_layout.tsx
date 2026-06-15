import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task" />
      <Stack.Screen
        name="completed"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
