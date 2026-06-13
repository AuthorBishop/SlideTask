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

const LABEL_MAX_WIDTH = 72;
const TRACK_HEIGHT = 6;
const NODE_DOT_R = 5;
const LABEL_LINE_HEIGHT = 14;

export default function TaskCard({ task, onUpdate, onOpenDetail }: TaskCardProps) {
  const { nodes, color, note } = task;
  const nodeCount = nodes.length;
  const step = nodeCount > 1 ? 1 / (nodeCount - 1) : 1;

  const [progress, setProgress] = useState(task.progress_position);
  const [barWidth, setBarWidth] = useState(0);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [localTitles, setLocalTitles] = useState<Record<string, string>>(
    () => Object.fromEntries(nodes.map((n) => [n.id, n.title]))
  );
  const editInputRef = useRef<TextInput>(null);

  const dragProgress = useSharedValue(task.progress_position);

  useEffect(() => {
    setProgress(task.progress_position);
    dragProgress.value = task.progress_position;
    setLocalTitles(Object.fromEntries(nodes.map((n) => [n.id, n.title])));
  }, [task.progress_position, nodes]);

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

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

  // ── 拖动手势 ──
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

  const bgColor = hexToRgba(color, 0.08);

  const LABEL_ROWS = 1;
  const ABOVE_HEIGHT = LABEL_LINE_HEIGHT * LABEL_ROWS + 2;
  const BELOW_HEIGHT = LABEL_LINE_HEIGHT * LABEL_ROWS + 2;
  const CONTAINER_HEIGHT = ABOVE_HEIGHT + NODE_DOT_R * 2 + TRACK_HEIGHT + 6 + BELOW_HEIGHT;

  return (
    <View
      style={{ borderCurve: 'continuous', backgroundColor: bgColor, borderRadius: 16 }}
      className="px-4 pt-3 pb-3 mb-3"
    >
      {/* ── 任务标题行 ── */}
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
        {/* 详情按钮（独立按钮，点击卡片不跳转） */}
        <Pressable
          onPress={() => onOpenDetail(task.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginLeft: 8 }}
        >
          <Text
            className="text-xs font-sans"
            style={{ color }}
          >
            详情
          </Text>
        </Pressable>
      </View>

      {/* ── 进度条容器 ── */}
      <View
        style={{ height: CONTAINER_HEIGHT, position: 'relative' }}
        onLayout={onBarLayout}
      >
        {/* 轨道背景 + 拖动手势（两端对齐） */}
        <GestureDetector gesture={panGesture}>
          <View
            style={{
              position: 'absolute',
              top: ABOVE_HEIGHT + (NODE_DOT_R * 2 - TRACK_HEIGHT) / 2,
              left: 0,
              right: 0,
              height: TRACK_HEIGHT + 12,
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                height: TRACK_HEIGHT,
                backgroundColor: '#F1F1F4',
                borderRadius: 999,
                overflow: 'hidden',
                flex: 1,
              }}
            >
              <Animated.View style={[fillStyle, { height: TRACK_HEIGHT, backgroundColor: color, borderRadius: 999 }]} />
            </View>
          </View>
        </GestureDetector>

        {/* ── 单节点 ── */}
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

        {/* ── 多节点：圆点 + 标签 ── */}
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
              {/* 节点圆点（首尾对齐到边缘） */}
              <View
                style={{
                  position: 'absolute',
                  top: dotTop,
                  left: isFirst ? 0 : (isLast ? undefined : dotLeft),
                  right: isLast ? 0 : undefined,
                  ...(isFirst || isLast
                    ? { transform: [{ translateX: isFirst ? -NODE_DOT_R : NODE_DOT_R }] }
                    : {}),
                  width: isFirst || isLast ? NODE_DOT_R * 2 : NODE_DOT_R * 2,
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

        {/* ── 可拖动的进度圆点（始终可见）── */}
        {barWidth > 0 && (
          <>
            {/* 拖动手势覆盖层 */}
            <GestureDetector gesture={panGesture}>
              <View
                style={{
                  position: 'absolute',
                  top: ABOVE_HEIGHT - 5,
                  left: 0,
                  right: 0,
                  height: NODE_DOT_R * 2 + 12,
                }}
              />
            </GestureDetector>
            {/* 圆点把手 */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: ABOVE_HEIGHT - 2,
                  width: NODE_DOT_R * 2 + 4,
                  height: NODE_DOT_R * 2 + 4,
                  borderRadius: (NODE_DOT_R * 2 + 4) / 2,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2.5,
                  borderColor: color,
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 1.5 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 3,
                  transform: [{ translateX: -(NODE_DOT_R * 2 + 4) / 2 }],
                },
                handlePositionStyle,
              ]}
            />
            {/* 双竖线 ⋮⋮ 叠加在圆点上 */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: ABOVE_HEIGHT + 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ translateX: -6 }],
                },
                handlePositionStyle,
              ]}
            >
              <View style={{ flexDirection: 'row', gap: 2.5 }}>
                <View style={{ width: 2, height: 9, borderRadius: 1, backgroundColor: color }} />
                <View style={{ width: 2, height: 9, borderRadius: 1, backgroundColor: color }} />
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
