import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { RefreshCw, Target, X } from 'lucide-react-native';

import { TaskWithNodes } from '@/types/types';
import { useConfirm } from '@/ctx/confirm';
import { clearTodayFocus } from '@/utils/focus';

interface DailyFocusCardProps {
  task: TaskWithNodes;
  onChanged: () => void;
}

/**
 * 首页顶部"今日只做这一件"卡片
 * 展示今日焦点任务，可换一个（进抽取页）或清除；不强制，仅引导
 */
export default function DailyFocusCard({ task, onChanged }: DailyFocusCardProps) {
  const router = useRouter();
  const { showConfirm } = useConfirm();

  const nodeCount = task.nodes.length;
  const doneCount = Math.min(
    nodeCount,
    Math.round(task.progress_position * nodeCount),
  );

  const handleClear = async () => {
    const ok = await showConfirm({
      title: '清除今日焦点',
      message: '清除后今日不再显示焦点任务，可以随时重新抽取。',
      confirmText: '清除',
    });
    if (ok) {
      await clearTodayFocus();
      onChanged();
    }
  };

  return (
    <View
      className="rounded-2xl overflow-hidden mb-4"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
        <View className="w-9 h-9 items-center justify-center rounded-full" style={{ backgroundColor: '#EEF2FF' }}>
          <Target size={16} color="#6366F1" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-glow-sans-sc text-muted-foreground">
            今日只做这一件
          </Text>
          <Text
            numberOfLines={1}
            className="text-base font-glow-sans-sc text-foreground font-semibold mt-0.5"
          >
            {task.title}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/pick')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F3F4F6' }}
        >
          <RefreshCw size={15} color="#6B7280" />
        </Pressable>
        <Pressable
          onPress={handleClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F3F4F6' }}
        >
          <X size={15} color="#6B7280" />
        </Pressable>
      </View>

      {/* 进度条：点击卡片主体进入任务详情 */}
      <Pressable
        onPress={() => router.push(`/(app)/task/${task.id}`)}
        className="px-4 pb-4"
      >
        <View className="h-2 rounded-full" style={{ backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
          <View
            className="h-2 rounded-full"
            style={{
              width: `${Math.max(0, Math.min(1, task.progress_position)) * 100}%`,
              backgroundColor: task.color,
            }}
          />
        </View>
        <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-2">
          {nodeCount > 0 ? `已完成 ${doneCount}/${nodeCount} 个节点` : `${Math.round(task.progress_position * 100)}%`}
        </Text>
      </Pressable>
    </View>
  );
}
