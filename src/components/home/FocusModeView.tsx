import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, Target } from 'lucide-react-native';

import { TaskWithNodes } from '@/types/types';
import { useConfirm } from '@/ctx/confirm';
import TaskCard from '@/components/tasks/TaskCard';

interface FocusModeViewProps {
  /** 今日焦点任务（放大展示） */
  task: TaskWithNodes;
  /** 其余进行中任务（折叠到"查看其他"按钮里） */
  otherTasks: TaskWithNodes[];
  /** 退出专注模式（保留今日焦点，回普通列表） */
  onLeave: () => void;
  /** 任务进度/状态变化后刷新数据 */
  onUpdate: () => void;
}

/**
 * 单任务专注模式视图
 * 抽取并设为今日焦点后，首页只展示焦点任务；
 * 其余任务折叠到一个"查看其他 N 个任务"按钮，点击可展开/收起（仍在专注模式）；
 * 屏幕底部固定灰色小字"离开专注模式"，点击先弹确认框，确认才退出专注模式；
 * 退出仅关闭开关并保留今日焦点，之后可随时经焦点卡/重新抽取再次进入专注。
 */
export default function FocusModeView({ task, otherTasks, onLeave, onUpdate }: FocusModeViewProps) {
  const router = useRouter();
  const { showConfirm } = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const otherCount = otherTasks.length;
  const openDetail = (taskId: string) => router.push(`/(app)/task/${taskId}`);

  // 底部"离开专注模式"：先确认再退出；退出仍保留今日焦点，方便再次进入
  const handleLeavePress = async () => {
    const ok = await showConfirm({
      title: '离开专注模式',
      message: '确定要离开专注模式吗？离开后仍保留今日焦点，可随时再次进入专注。',
      confirmText: '离开',
    });
    if (ok) onLeave();
  };

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 专注模式标签 */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="w-7 h-7 items-center justify-center rounded-full" style={{ backgroundColor: `${task.color}22` }}>
            <Target size={14} color={task.color} />
          </View>
          <Text className="text-sm font-glow-sans-sc font-semibold" style={{ color: task.color }}>
            专注模式
          </Text>
          <View className="h-px flex-1 ml-1" style={{ backgroundColor: '#F3F4F6' }} />
        </View>

        {/* 焦点任务大卡：任务色描边强调 + 内部完整 TaskCard 可拖动进度 */}
        <View
          className="rounded-3xl mb-3 overflow-hidden"
          style={{ borderWidth: 1.5, borderColor: `${task.color}33`, backgroundColor: '#FFFFFF' }}
        >
          <View className="px-5 pt-4 pb-1">
            <Text className="text-xs font-glow-sans-sc text-muted-foreground">今日只做这一件</Text>
            <Text className="text-xl font-glow-sans-sc text-foreground font-semibold mt-0.5" numberOfLines={1}>
              {task.title}
            </Text>
          </View>
          <View className="px-2 pb-1">
            {/* 外层已展示任务标题，隐藏 TaskCard 内部标题行避免重复 */}
            <TaskCard task={task} onUpdate={onUpdate} onOpenDetail={openDetail} hideTitle />
          </View>
        </View>

        {/* 其余任务折叠按钮：展开/收起不退出专注模式 */}
        {otherCount > 0 && (
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            className="flex-row items-center justify-center gap-1.5 py-3.5 rounded-2xl"
            style={{ backgroundColor: '#F9FAFB' }}
          >
            <Text className="text-sm font-glow-sans-sc font-medium" style={{ color: '#6B7280' }}>
              {expanded ? '收起其他任务' : `查看其他 ${otherCount} 个任务`}
            </Text>
            <ChevronDown
              size={15}
              color="#9CA3AF"
              style={{ transform: expanded ? [{ rotate: '180deg' }] : [] }}
            />
          </Pressable>
        )}

        {expanded && otherCount > 0 && (
          <View className="pt-2">
            {otherTasks.map((t) => (
              <TaskCard key={t.id} task={t} onUpdate={onUpdate} onOpenDetail={openDetail} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 底部固定：灰色小字"离开专注模式"，点击弹确认框 */}
      <View className="items-center pb-5 pt-1">
        <Pressable onPress={handleLeavePress} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
          <Text
            className="text-xs font-glow-sans-sc"
            style={{ color: '#9CA3AF', textDecorationLine: 'underline' }}
          >
            离开专注模式
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
