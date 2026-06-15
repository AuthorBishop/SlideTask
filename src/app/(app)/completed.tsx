import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchTasksWithNodes, uncompleteTask } from '@/db/api';
import { TaskWithNodes } from '@/types/types';

export default function CompletedScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithNodes[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompleted = useCallback(async () => {
    try {
      const data = await fetchTasksWithNodes(true);
      setTasks(data);
    } catch (e) {
      console.error('加载已完成任务失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCompleted();
    }, [loadCompleted])
  );

  const handleUncomplete = (taskId: string, taskTitle: string) => {
    Alert.alert(
      '确认取消完成',
      `确认取消完成任务「${taskTitle}」吗？任务将回到主页列表。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认取消',
          onPress: async () => {
            try {
              await uncompleteTask(taskId);
              await loadCompleted();
            } catch (e) {
              console.error('取消完成失败', e);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* 顶部导航 */}
      <View className="px-5 pt-4 pb-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="mr-4"
        >
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-glow-sans-sc text-foreground font-semibold">
            已完成
          </Text>
          <Text className="text-sm font-glow-sans-sc text-muted-foreground mt-0.5">
            {tasks.length > 0 ? `${tasks.length} 个已完成任务` : '暂无已完成任务'}
          </Text>
        </View>
      </View>

      {/* 已完成任务列表 */}
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
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              className="px-4 pt-3 pb-3 mb-3 rounded-2xl flex-row items-center"
              style={{
                backgroundColor: '#F8F9FB',
                borderCurve: 'continuous',
              }}
            >
              {/* 任务信息 */}
              <View className="flex-1">
                <Text
                  className="text-sm font-sans text-foreground"
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.note.trim() !== '' && (
                  <Text
                    className="text-xs font-sans text-muted-foreground mt-0.5"
                    numberOfLines={1}
                  >
                    {item.note.trim()}
                  </Text>
                )}
                {item.completed_at && (
                  <Text className="text-xs font-sans text-muted-foreground mt-1">
                    完成于 {new Date(item.completed_at).toLocaleDateString('zh-CN')}
                  </Text>
                )}
              </View>

              {/* 取消完成按钮 */}
              <Pressable
                onPress={() => handleUncomplete(item.id, item.title)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="ml-3 p-2 rounded-full"
                style={{ backgroundColor: '#E5E7EB' }}
              >
                <RotateCcw size={16} color="#6B7280" />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center pt-24 px-8">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: '#F8F9FB' }}
              >
                <Text style={{ fontSize: 28 }}>✓</Text>
              </View>
              <Text className="text-base font-glow-sans-sc text-foreground text-center mb-1">
                暂无已完成任务
              </Text>
              <Text className="text-sm font-glow-sans-sc text-muted-foreground text-center">
                完成一个任务后它会出现在这里
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
