import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TaskWithNodes } from '@/types/types';
import { updateTaskProgress, updateNodeTitle } from '@/db/api';

interface TaskCardProps {
  task: TaskWithNodes;
  onUpdate: () => void;
  onOpenDetail: (taskId: string) => void;
}

// 根据进度(0~1)和节点列表，计算当前节点和下一节点
function getNodeContext(progress: number, nodeCount: number) {
  if (nodeCount === 0) return { currentIdx: -1, nextIdx: -1 };
  if (nodeCount === 1) return { currentIdx: 0, nextIdx: -1 };

  // 节点均匀分布在 0..1
  const step = 1 / (nodeCount - 1);
  let currentIdx = -1;
  let nextIdx = -1;

  for (let i = 0; i < nodeCount; i++) {
    const nodePos = i * step;
    if (nodePos <= progress + 0.001) {
      currentIdx = i;
    }
  }
  nextIdx = currentIdx < nodeCount - 1 ? currentIdx + 1 : -1;
  return { currentIdx, nextIdx };
}

export default function TaskCard({ task, onUpdate, onOpenDetail }: TaskCardProps) {
  const { nodes, color } = task;
  const nodeCount = nodes.length;

  const [progress, setProgress] = useState(task.progress_position);
  const [barWidth, setBarWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // 编辑节点文字
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const editInputRef = useRef<TextInput>(null);

  // 动画值
  const expandAnim = useSharedValue(0);
  const dragProgress = useSharedValue(progress);

  useEffect(() => {
    setProgress(task.progress_position);
    dragProgress.value = task.progress_position;
  }, [task.progress_position]);

  useEffect(() => {
    expandAnim.value = withTiming(expanded ? 1 : 0, { duration: 260 });
  }, [expanded]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  // 保存进度到数据库
  const saveProgress = useCallback(
    async (val: number) => {
      setProgress(val);
      try {
        await updateTaskProgress(task.id, val);
        onUpdate();
      } catch (e) {
        console.error('保存进度失败', e);
      }
    },
    [task.id, onUpdate]
  );

  // 拖动手势
  const startX = useSharedValue(0);
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = dragProgress.value * barWidth;
    })
    .onUpdate((e) => {
      if (barWidth <= 0) return;
      const newX = Math.max(0, Math.min(barWidth, startX.value + e.translationX));
      dragProgress.value = newX / barWidth;
    })
    .onEnd(() => {
      runOnJS(saveProgress)(dragProgress.value);
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: `${dragProgress.value * 100}%`,
  }));

  const expandedContainerStyle = useAnimatedStyle(() => ({
    height: expandAnim.value * 100,
    opacity: expandAnim.value,
    overflow: 'hidden',
  }));

  // 拖动把手位置样式（必须在顶层调用，不能放在条件渲染内）
  const handlePositionStyle = useAnimatedStyle(() => ({
    left: `${dragProgress.value * 100}%`,
  }));

  const { currentIdx, nextIdx } = getNodeContext(progress, nodeCount);
  const currentNodeTitle = currentIdx >= 0 ? nodes[currentIdx].title : '';
  const nextNodeTitle = nextIdx >= 0 ? nodes[nextIdx].title : '';

  const step = nodeCount > 1 ? 1 / (nodeCount - 1) : 1;

  // 保存节点标题
  const saveNodeTitle = async () => {
    if (!editingNodeId) return;
    const node = nodes.find((n) => n.id === editingNodeId);
    if (!node || editingText.trim() === '') {
      setEditingNodeId(null);
      return;
    }
    try {
      await updateNodeTitle(editingNodeId, editingText);
      onUpdate();
    } catch (e) {
      console.error('保存节点失败', e);
    }
    setEditingNodeId(null);
  };

  const startEditNode = (nodeId: string, currentTitle: string) => {
    setEditingNodeId(nodeId);
    setEditingText(currentTitle);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  return (
    <Pressable
      onPress={() => {
        if (editingNodeId) return;
        setExpanded((v) => !v);
      }}
      style={{ borderCurve: 'continuous' }}
      className="bg-card rounded-2xl px-5 pt-5 pb-4 mb-3"
    >
      {/* 任务标题行 */}
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-base font-glow-sans-sc text-foreground flex-1 mr-2"
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {/* 颜色指示点 */}
        <View
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      </View>

      {/* 节点文字提示：上下错开布局，确保文字完整显示不截断 */}
      {nodeCount > 0 && (
        <View style={{ minHeight: nextIdx >= 0 ? 34 : 18, marginBottom: 6, position: 'relative' }}>
          {/* 当前节点：左侧，上方 */}
          {currentIdx >= 0 && (
            <Pressable
              onPress={() => expanded && startEditNode(nodes[currentIdx].id, nodes[currentIdx].title)}
              style={{ position: 'absolute', top: 0, left: 2, maxWidth: '70%' }}
            >
              <Text className="text-xs font-glow-sans-sc" style={{ color: color }} numberOfLines={2}>
                {currentNodeTitle}
              </Text>
            </Pressable>
          )}
          {/* 下一节点：右侧，下方错开 16px，避免与左侧文字重叠 */}
          {nextIdx >= 0 && (
            <Pressable
              onPress={() => expanded && startEditNode(nodes[nextIdx].id, nodes[nextIdx].title)}
              style={{ position: 'absolute', top: 16, right: 2, maxWidth: '70%' }}
            >
              <Text
                className="text-xs font-glow-sans-sc text-muted-foreground"
                style={{ textAlign: 'right' }}
                numberOfLines={2}
              >
                {nextNodeTitle}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 进度条区域 */}
      <View
        className="relative"
        onLayout={onBarLayout}
      >
        {/* 背景轨道 */}
        <View
          className="w-full rounded-full overflow-hidden"
          style={{ height: 6, backgroundColor: '#F1F1F4' }}
        >
          <Animated.View
            style={[fillStyle, { height: 6, borderRadius: 999, backgroundColor: color }]}
          />
        </View>

        {/* 节点标记点 */}
        {nodeCount > 1 &&
          nodes.map((node, i) => {
            const nodePos = i * step;
            const isCompleted = nodePos <= progress + 0.001;
            return (
              <View
                key={node.id}
                style={{
                  position: 'absolute',
                  top: -3,
                  left: `${nodePos * 100}%`,
                  transform: [{ translateX: -5 }],
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: isCompleted ? color : '#E5E7EB',
                  backgroundColor: isCompleted ? color : '#FFFFFF',
                }}
              />
            );
          })}

        {/* 拖动把手（展开时显示） */}
        {expanded && barWidth > 0 && (
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: -8,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2.5,
                  borderColor: color,
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                  transform: [{ translateX: -11 }],
                },
                handlePositionStyle,
              ]}
            />
          </GestureDetector>
        )}
      </View>

      {/* 展开后的操作区 */}
      <Animated.View style={expandedContainerStyle}>
        <View className="mt-4 flex-row items-center justify-between">
          {/* 节点编辑输入框 */}
          {editingNodeId ? (
            <TextInput
              ref={editInputRef}
              value={editingText}
              onChangeText={setEditingText}
              onBlur={saveNodeTitle}
              onSubmitEditing={saveNodeTitle}
              returnKeyType="done"
              className="flex-1 text-sm font-glow-sans-sc text-foreground border-b border-border py-1 mr-3"
              placeholder="编辑节点名称"
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text className="text-xs font-glow-sans-sc text-muted-foreground flex-1">
              拖动进度 · 点击节点名称编辑
            </Text>
          )}
          <Pressable
            onPress={() => {
              setExpanded(false);
              onOpenDetail(task.id);
            }}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: `${color}18` }}
          >
            <Text className="text-xs font-glow-sans-sc" style={{ color }}>
              详情
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}
