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

// 每个节点标签的宽度上限（px）
const LABEL_MAX_WIDTH = 72;
// 进度条轨道距容器顶部的偏移（用于节点标签定位）
const TRACK_TOP = 28; // 上方标签区高度
const TRACK_HEIGHT = 6;
const NODE_DOT_R = 6; // 节点圆半径

export default function TaskCard({ task, onUpdate, onOpenDetail }: TaskCardProps) {
  const { nodes, color } = task;
  const nodeCount = nodes.length;
  const step = nodeCount > 1 ? 1 / (nodeCount - 1) : 1;

  const [progress, setProgress] = useState(task.progress_position);
  const [barWidth, setBarWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // 节点内联编辑（直接在进度条标签上编辑）
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  // 本地节点标题缓存，保存成功后更新，避免每次编辑都触发全局 reload
  const [localTitles, setLocalTitles] = useState<Record<string, string>>(
    () => Object.fromEntries(nodes.map((n) => [n.id, n.title]))
  );
  const editInputRef = useRef<TextInput>(null);

  // 动画值
  const expandAnim = useSharedValue(0);
  const dragProgress = useSharedValue(task.progress_position);

  // 当外部 task 数据更新时同步本地状态（但不触发 re-fetch 循环）
  useEffect(() => {
    setProgress(task.progress_position);
    dragProgress.value = task.progress_position;
    setLocalTitles(Object.fromEntries(nodes.map((n) => [n.id, n.title])));
  }, [task.progress_position, nodes]);

  useEffect(() => {
    expandAnim.value = withTiming(expanded ? 1 : 0, { duration: 240 });
  }, [expanded]);

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  // ── 进度保存：仅更新本地 state + DB，不触发全列表 re-fetch ──
  const saveProgress = useCallback(
    async (val: number) => {
      setProgress(val);
      try {
        await updateTaskProgress(task.id, val);
        // 不调用 onUpdate()，避免重新排序整个列表
      } catch (e) {
        console.error('保存进度失败', e);
      }
    },
    [task.id]
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
    height: expandAnim.value * 48,
    opacity: expandAnim.value,
    overflow: 'hidden',
  }));

  const handlePositionStyle = useAnimatedStyle(() => ({
    left: `${dragProgress.value * 100}%`,
  }));

  // ── 节点标题保存：仅更新本地缓存 + DB，不触发全列表 re-fetch ──
  const saveNodeTitle = useCallback(async () => {
    if (!editingNodeId || !editingText.trim()) {
      setEditingNodeId(null);
      return;
    }
    const trimmed = editingText.trim();
    // 乐观更新本地缓存
    setLocalTitles((prev) => ({ ...prev, [editingNodeId]: trimmed }));
    setEditingNodeId(null);
    try {
      await updateNodeTitle(editingNodeId, trimmed);
      // 不调用 onUpdate()，节点标题改动不影响列表顺序
    } catch (e) {
      console.error('保存节点标题失败', e);
      // 回滚本地缓存
      setLocalTitles((prev) => ({
        ...prev,
        [editingNodeId]: nodes.find((n) => n.id === editingNodeId)?.title ?? prev[editingNodeId],
      }));
    }
  }, [editingNodeId, editingText, nodes]);

  const startEditNode = useCallback((nodeId: string, currentTitle: string) => {
    setEditingNodeId(nodeId);
    setEditingText(currentTitle);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, []);

  // 进度条容器总高度 = 上方标签区 + 轨道 + 下方标签区
  const LABEL_LINE_HEIGHT = 16; // 单行标签高度
  const LABEL_ROWS = 2;         // 允许最多两行
  const ABOVE_HEIGHT = LABEL_LINE_HEIGHT * LABEL_ROWS + 4; // 上方区域高度
  const BELOW_HEIGHT = LABEL_LINE_HEIGHT * LABEL_ROWS + 4; // 下方区域高度
  const CONTAINER_HEIGHT = ABOVE_HEIGHT + TRACK_HEIGHT + 12 + BELOW_HEIGHT; // 12 = 节点直径差补偿

  return (
    <Pressable
      onPress={() => {
        if (editingNodeId) {
          // 点击卡片空白区域时先提交编辑
          saveNodeTitle();
          return;
        }
        setExpanded((v) => !v);
      }}
      style={{ borderCurve: 'continuous' }}
      className="bg-card rounded-2xl px-5 pt-5 pb-4 mb-3"
    >
      {/* ── 任务标题行 ── */}
      <View className="flex-row items-center justify-between mb-4">
        <Text
          className="text-base font-glow-sans-sc text-foreground flex-1 mr-2"
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      </View>

      {/* ── 进度条 + 节点标签一体容器 ── */}
      <View
        style={{ height: CONTAINER_HEIGHT, position: 'relative' }}
        onLayout={onBarLayout}
      >
        {/* 轨道背景 */}
        <View
          style={{
            position: 'absolute',
            top: ABOVE_HEIGHT + (NODE_DOT_R * 2 - TRACK_HEIGHT) / 2,
            left: 0,
            right: 0,
            height: TRACK_HEIGHT,
            backgroundColor: '#F1F1F4',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <Animated.View style={[fillStyle, { height: TRACK_HEIGHT, backgroundColor: color }]} />
        </View>

        {/* ── 单节点特殊处理：仅显示标签，不画圆点 ── */}
        {barWidth > 0 && nodeCount === 1 && (() => {
          const node = nodes[0];
          const isEditing = editingNodeId === node.id;
          const displayTitle = localTitles[node.id] ?? node.title;
          return (
            <View
              key={node.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: ABOVE_HEIGHT - 4,
                justifyContent: 'flex-end',
                maxWidth: barWidth,
              }}
            >
              {isEditing ? (
                <TextInput
                  ref={editInputRef}
                  value={editingText}
                  onChangeText={setEditingText}
                  onBlur={saveNodeTitle}
                  onSubmitEditing={saveNodeTitle}
                  returnKeyType="done"
                  style={{
                    fontSize: 11,
                    color: '#374151',
                    borderBottomWidth: 1,
                    borderBottomColor: color,
                    paddingBottom: 1,
                    fontFamily: 'GlowSansSC-Normal-Regular',
                    minWidth: 60,
                  }}
                  autoFocus
                />
              ) : (
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); startEditNode(node.id, displayTitle); }}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color,
                      fontFamily: 'GlowSansSC-Normal-Regular',
                    }}
                    numberOfLines={1}
                  >
                    {displayTitle}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })()}

        {/* ── 多节点：圆点 + 交错标签 ── */}
        {barWidth > 0 && nodeCount > 1 && nodes.map((node, i) => {
          const nodePos = i * step;
          const leftPx = nodePos * barWidth;
          const isCompleted = nodePos <= progress + 0.001;
          const isAbove = i % 2 === 0; // 偶数节点标签在上，奇数在下
          const isFirst = i === 0;
          const isLast = i === nodeCount - 1;
          const dotLeft = Math.max(0, leftPx - NODE_DOT_R); // 防止负值溢出
          const dotTop = ABOVE_HEIGHT;

          // 标签水平位置：首节点左对齐，末节点右对齐，其余居中
          let labelLeft = leftPx - LABEL_MAX_WIDTH / 2;
          if (isFirst) labelLeft = 0;
          if (isLast) labelLeft = Math.max(0, barWidth - LABEL_MAX_WIDTH);
          labelLeft = Math.max(0, Math.min(barWidth - LABEL_MAX_WIDTH, labelLeft));

          const isEditing = editingNodeId === node.id;
          const displayTitle = localTitles[node.id] ?? node.title;

          return (
            <View key={node.id}>
              {/* 节点圆点 */}
              <View
                style={{
                  position: 'absolute',
                  top: dotTop,
                  left: dotLeft,
                  width: NODE_DOT_R * 2,
                  height: NODE_DOT_R * 2,
                  borderRadius: NODE_DOT_R,
                  borderWidth: 2,
                  borderColor: isCompleted ? color : '#E5E7EB',
                  backgroundColor: isCompleted ? color : '#FFFFFF',
                }}
              />

              {/* 节点标签 */}
              <View
                style={{
                  position: 'absolute',
                  left: labelLeft,
                  width: LABEL_MAX_WIDTH,
                  ...(isAbove
                    ? { top: 0, justifyContent: 'flex-end', height: ABOVE_HEIGHT - 4 }
                    : { top: ABOVE_HEIGHT + NODE_DOT_R * 2 + 4, height: BELOW_HEIGHT - 4 }),
                }}
              >
                {isEditing ? (
                  <TextInput
                    ref={editInputRef}
                    value={editingText}
                    onChangeText={setEditingText}
                    onBlur={saveNodeTitle}
                    onSubmitEditing={saveNodeTitle}
                    returnKeyType="done"
                    style={{
                      fontSize: 11,
                      color: '#374151',
                      borderBottomWidth: 1,
                      borderBottomColor: color,
                      paddingBottom: 1,
                      fontFamily: 'GlowSansSC-Normal-Regular',
                    }}
                    autoFocus
                  />
                ) : (
                  <Pressable
                    onPress={(e) => { e.stopPropagation?.(); startEditNode(node.id, displayTitle); }}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: isCompleted ? color : '#9CA3AF',
                        fontFamily: 'GlowSansSC-Normal-Regular',
                        textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                      }}
                      numberOfLines={2}
                    >
                      {displayTitle}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* 拖动把手（展开时显示） */}
        {expanded && barWidth > 0 && (
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: ABOVE_HEIGHT - 5,
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

      {/* ── 展开后操作区 ── */}
      <Animated.View style={expandedContainerStyle}>
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs font-glow-sans-sc text-muted-foreground flex-1">
            拖动调整进度 · 点击标签直接编辑
          </Text>
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
