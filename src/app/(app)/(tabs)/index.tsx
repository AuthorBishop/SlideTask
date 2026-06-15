import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchTasksWithNodes } from '@/db/api';
import { TaskWithNodes } from '@/types/types';
import TaskCard from '@/components/tasks/TaskCard';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';

export default function HomeScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithNodes[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasksWithNodes();
      setTasks(data);
    } catch (e) {
      console.error('加载任务失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const handleOpenDetail = (taskId: string) => {
    router.push(`/(app)/task/${taskId}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* 顶部标题区 */}
      <View className="px-5 pt-4 pb-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-glow-sans-sc text-foreground font-semibold tracking-tight">
              流程
            </Text>
            <Text className="text-sm font-glow-sans-sc text-muted-foreground mt-1">
              {tasks.length > 0 ? `${tasks.length} 个进行中` : '开始管理你的任务'}
            </Text>
          </View>
          {/* 已完成入口 */}
          <Pressable
            onPress={() => router.push('/(app)/completed')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            <Text className="text-sm font-glow-sans-sc" style={{ color: '#6B7280' }}>
              已完成
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 任务列表 */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onUpdate={loadTasks}
              onOpenDetail={handleOpenDetail}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center pt-24 px-8">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: '#F8F9FB' }}
              >
                <Text style={{ fontSize: 28 }}>✦</Text>
              </View>
              <Text className="text-base font-glow-sans-sc text-foreground text-center mb-1">
                暂无任务
              </Text>
              <Text className="text-sm font-glow-sans-sc text-muted-foreground text-center">
                点击右下角 + 创建第一个任务
              </Text>
            </View>
          }
        />
      )}

      {/* 新建任务浮动按钮 */}
      <Pressable
        onPress={() => setShowCreate(true)}
        style={{
          position: 'absolute',
          bottom: 36,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#111827',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(17,24,39,0.18)' }],
        }}
      >
        <Plus size={22} color="#FFFFFF" strokeWidth={2} />
      </Pressable>

      {/* 新建任务弹窗 */}
      <CreateTaskModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadTasks}
      />
    </SafeAreaView>
  );
}
