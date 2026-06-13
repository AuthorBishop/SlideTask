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
const TRACK_TOP = 16; // 缩小上方区域
const TRACK_HEIGHT = 6;
const NODE_DOT_R = 5; // 节点圆半径略缩小
const LABEL_LINE_HEIGHT = 14; // 单行标签高度缩小

export default function TaskCard({ task, onUpdate, onOpenDetail }: TaskCardProps) {
  const { nodes, color, note } = task;
  const nodeCount = nodes.length;
  const step = nodeCount > 1 ? 1 / (nodeCount - 1) : 1;

  const [progress, setProgress] = useState(task.progress_position);
  const [barWidth, setBarWidth] = useState(0);

  // 节点内联编辑
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [localTitles, setLocalTitles] = useState<Record<string, string>>(
    () => Object.fromEntries(nodes.map((n) => [n.id, n.title]))
  );
  const editInputRef = useRef<TextInput>(null);

  // 动画值
  const dragProgress = useSharedValue(task.progress_position);

  // 同步外部数据
  useEffect(() => {
    setProgress(task.progress_position);
    dragProgress.value = task.progress_position;
    setLocalTitles(Object.fromEntries(nodes.map((n) => [n.id, n.title])));
  }, [task.progress_position, nodes]);

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  // 进度保存
  const saveProgress = useCallback(
    async (val: number) => {
      setProgress(val);
      try {
        await updateTaskProgress(task.id, val);
      } catch (e) {
        console.error('保存进度失败', e);
      }
    },
    [task.id]
  );

  // ── 拖动手势：始终在进度条轨道上可用 ──
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

  const handlePositionStyle = useAnimatedStyle(() => ({
    left: `${dragProgress.value * 100}%`,
  }));

  // 节点标题保存
  const saveNodeTitle = useCallback(async () => {
    if (!editingNodeId || !editingText.trim()) {
      setEditingNodeId(null);
      return;
    }
    const trimmed = editingText.trim();
    setLocalTitles((prev) => ({ ...prev, [editingNodeId]: trimmed }));
    setEditingNodeId(null);
    try {
      await updateNodeTitle(editingNodeId, trimmed);
    } catch (e) {
      console.error('保存节点标题失败', e);
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

  // 根据 task.color 生成浅色背景（hex → rgba 低透明度）
  const bgColor = hexToRgba(color, 0.08);

  // 高度计算：缩小标签区为 1 行
  const LABEL_ROWS = 1;
  const ABOVE_HEIGHT = LABEL_LINE_HEIGHT * LABEL_ROWS + 2;
  const BELOW_HEIGHT = LABEL_LINE_HEIGHT * LABEL_ROWS + 2;
  const CONTAINER_HEIGHT = ABOVE_HEIGHT + NODE_DOT_R * 2 + TRACK_HEIGHT + 4 + BELOW_HEIGHT;

  return (
    <Pressable
      onPress={() => {
        if (editingNodeId) {
          saveNodeTitle();
          return;
        }
        onOpenDetail(task.id);
      }}
      style={{ borderCurve: 'continuous', backgroundColor: bgColor, borderRadius: 16 }}
      className="px-4 pt-3 pb-3 mb-3"
    >
      {/* ── 任务标题行（备注灰色小字在名称后方）── */}
      <View className="flex-row items-center mb-2">
        <Text
          className="text-sm font-sans text-foreground flex-shrink"
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {note.trim() !== '' && (
          <Text
            className="text-xs font-sans text-muted-foreground ml-2 flex-1"
            numberOfLines={1}
          >
            {note.trim()}
          </Text>
        )}
      </View>

      {/* ── 进度条 + 节点标签一体容器 ── */}
      <View
        style={{ height: CONTAINER_HEIGHT, position: 'relative' }}
        onLayout={onBarLayout}
      >
        {/* 轨道背景（带拖动手势） */}
        <GestureDetector gesture={panGesture}>
          <View
            style={{
              position: 'absolute',
              top: ABOVE_HEIGHT + (NODE_DOT_R * 2 - TRACK_HEIGHT) / 2,
              left: 0,
              right: 0,
              height: TRACK_HEIGHT + 12, // 加大点击区域
              justifyContent: 'center',
              cursor: 'ew-resize',
            }}
          >
            <View
              style={{
                height: TRACK_HEIGHT,
                backgroundColor: '#F1F1F4',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <Animated.View style={[fillStyle, { height: TRACK_HEIGHT, backgroundColor: color }]} />
            </View>
          </View>
        </GestureDetector>

        {/* ── 单节点特殊处理 ── */}
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
                height: ABOVE_HEIGHT,
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
                    fontSize: 10,
                    color: '#374151',
                    borderBottomWidth: 1,
                    borderBottomColor: color,
                    paddingBottom: 1,
                    fontFamily: 'System',
                    minWidth: 60,
                  }}
                  autoFocus
                />
              ) : (
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); startEditNode(node.id, displayTitle); }}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text
                    style={{ fontSize: 10, color, fontFamily: 'System' }}
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
          const isAbove = i % 2 === 0;
          const isFirst = i === 0;
          const isLast = i === nodeCount - 1;
          const dotLeft = Math.max(0, leftPx - NODE_DOT_R);
          const dotTop = ABOVE_HEIGHT;

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
                    ? { top: 0, justifyContent: 'flex-end', height: ABOVE_HEIGHT }
                    : { top: ABOVE_HEIGHT + NODE_DOT_R * 2 + 2, height: BELOW_HEIGHT }),
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
                      fontSize: 10,
                      color: '#374151',
                      borderBottomWidth: 1,
                      borderBottomColor: color,
                      paddingBottom: 1,
                      fontFamily: 'System',
                    }}
                    autoFocus
                  />
                ) : (
                  <Pressable
                    onPress={(e) => { e.stopPropagation?.(); startEditNode(node.id, displayTitle); }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: isCompleted ? color : '#9CA3AF',
                        fontFamily: 'System',
                        textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                      }}
                      numberOfLines={1}
                    >
                      {displayTitle}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* ── 拖动把手 ⋮⋮（始终可见）── */}
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: ABOVE_HEIGHT - 3,
                width: 16,
                height: 18,
                borderRadius: 3,
                backgroundColor: 'transparent',
                transform: [{ translateX: -8 }],
                alignItems: 'center',
                justifyContent: 'center',
              },
              handlePositionStyle,
            ]}
          >
            {/* 双竖线把手 ⋮⋮ */}
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <View style={{ width: 2, height: 12, borderRadius: 1, backgroundColor: color, opacity: 0.7 }} />
              <View style={{ width: 2, height: 12, borderRadius: 1, backgroundColor: color, opacity: 0.7 }} />
            </View>
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}

/** hex(#RRGGBB) → rgba(r, g, b, alpha) */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
