import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckSquare } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // 单 tab，隐藏底部栏
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '任务',
            tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
