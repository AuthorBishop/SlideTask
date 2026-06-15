import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { updateTaskProgress, updateNodeTitle, completeTask } from '@/db/api';
import { CheckCircle } from 'lucide-react-native';
import { useFontSize } from '@/ctx/fontSize';

interface TaskCardProps {
  task: TaskWithNodes;
  onUpdate: () => void;
  onOpenDetail: (taskId: string) => void;
}

const LABEL_MAX_WIDTH = 80;
const TRACK_HEIGHT = 8;
const NODE_DOT_R = 6;
const HANDLE_SIZE = 18;
const LABEL_ROWS = 1;
const LABEL_MARGIN = 8;





export default function TaskCard({ task, onUpdate, onOpenDetail }: TaskCardProps) {
  const { nodes, color, note } = task;
  const nodeCount = nodes.length;
  const step = nodeCount > 1 ? 1 / (nodeCount - 1) : 1;

  const { fontSize: LABEL_FONT_SIZE } = useFontSize();
  const LINE_HEIGHT = LABEL_FONT_SIZE + 5;
  const ABOVE_HEIGHT = LINE_HEIGHT * LABEL_ROWS + LABEL_MARGIN;
  const BELOW_HEIGHT = LINE_HEIGHT * LABEL_ROWS + LABEL_MARGIN;

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
  // minDist=0：Web 端鼠标按下即拖，无激活死区
  // activateAfterLongPress=0：无需长按等待
  // failOffsetY=[-10,10]：允许小幅纵向偏移（避免滚动冲突）
  const startX = useSharedValue(0);
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(0)
    .minDistance(0)
    .failOffsetY([-10, 10])
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

  const handlePositionStyle = useAnimatedStyle(() => {
    // 用 marginLeft 代替 left，避免 translateX 叠加溢出
    // 把手中心对齐进度位置，marginLeft 自动扣除把手一半宽度
    const pct = dragProgress.value * 100;
    const marginLeftPx = (pct / 100) * barWidth - HANDLE_SIZE / 2;
    return {
      marginLeft: marginLeftPx,
    };
  });

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

  // 轨道几何计算（基于动态 LINE_HEIGHT）
  const TRACK_CENTER_Y = ABOVE_HEIGHT + NODE_DOT_R;
  const DOT_TOP = TRACK_CENTER_Y - NODE_DOT_R;
  const TRACK_TOP = TRACK_CENTER_Y - TRACK_HEIGHT / 2;
  const CONTAINER_HEIGHT = ABOVE_HEIGHT + NODE_DOT_R * 2 + TRACK_HEIGHT + 8 + BELOW_HEIGHT;

  const bgColor = hexToRgba(color, 0.08);

  // 完成确认弹窗
  const handleComplete = useCallback(() => {
    Alert.alert(
      '确认完成',
      `确认完成任务「${task.title}」吗？完成后将移至已完成列表。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认完成',
          onPress: async () => {
            try {
              await completeTask(task.id);
              onUpdate();
            } catch (e) {
              console.error('完成任务失败', e);
            }
          },
        },
      ],
    );
  }, [task.id, task.title, onUpdate]);

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
        {/* 完成按钮（右上角打勾） */}
        <Pressable
          onPress={handleComplete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginLeft: 12 }}
        >
          <CheckCircle size={18} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* ── 进度条容器 ── */}
      <View
        style={{ height: CONTAINER_HEIGHT, position: 'relative' }}
        onLayout={onBarLayout}
      >
        {/* ── 第1层：进度条轨道（最底层，纯视觉）── */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: TRACK_TOP,
            left: 0,
            right: 0,
            height: TRACK_HEIGHT,
            backgroundColor: '#E8E8ED',
            borderRadius: TRACK_HEIGHT / 2,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              fillStyle,
              {
                height: TRACK_HEIGHT,
                backgroundColor: color,
                borderRadius: TRACK_HEIGHT / 2,
              },
            ]}
          />
        </View>

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
                    fontSize: LABEL_FONT_SIZE,
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
                    style={{ fontSize: LABEL_FONT_SIZE, color, fontFamily: 'System', fontWeight: '500' }}
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
          const dotTop = DOT_TOP;

          // 动态标签最大宽度：节点间距的一半，防止相邻标签重叠
          const dynamicMaxWidth = Math.min(LABEL_MAX_WIDTH, barWidth / (nodeCount - 1));
          let labelLeft = leftPx - dynamicMaxWidth / 2;
          if (isFirst) labelLeft = 0;
          if (isLast) labelLeft = Math.max(0, barWidth - dynamicMaxWidth);
          labelLeft = Math.max(0, Math.min(barWidth - dynamicMaxWidth, labelLeft));

          const isEditing = editingNodeId === node.id;
          const displayTitle = localTitles[node.id] ?? node.title;

          return (
            <View key={node.id}>
              {/* 节点圆点（首尾对齐到边缘，不拦截触摸） */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: dotTop,
                  ...(isFirst
                    ? { left: -NODE_DOT_R }
                    : isLast
                    ? { right: -NODE_DOT_R }
                    : { left: dotLeft }),
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
                  width: dynamicMaxWidth,
                  ...(isAbove
                    ? { top: 0, justifyContent: 'flex-end', height: ABOVE_HEIGHT }
                    : { top: TRACK_CENTER_Y + NODE_DOT_R + 2, height: BELOW_HEIGHT }),
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
                      fontSize: LABEL_FONT_SIZE,
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
                        fontSize: LABEL_FONT_SIZE,
                        color: isCompleted ? color : '#9CA3AF',
                        fontFamily: 'System',
                        fontWeight: isCompleted ? '500' : '400',
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

        {/* ── 第3层：可拖动的进度把手（最上层，接收全部交互）── */}
        {barWidth > 0 && (
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: TRACK_CENTER_Y - HANDLE_SIZE / 2,
                  left: 0,
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  borderRadius: HANDLE_SIZE / 2,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 3,
                  borderColor: color,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  elevation: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                },
                handlePositionStyle,
              ]}
            >
              {/* 把手内芯（实心色圆） */}
              <View
                style={{
                  width: HANDLE_SIZE - 8,
                  height: HANDLE_SIZE - 8,
                  borderRadius: (HANDLE_SIZE - 8) / 2,
                  backgroundColor: color,
                }}
              />
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      {/* ── 右下角详情按钮 ── */}
      <View className="flex-row justify-end mt-2">
        <Pressable
          onPress={() => onOpenDetail(task.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: `${color}18` }}
        >
          <Text
            className="text-xs font-sans font-medium"
            style={{ color }}
          >
            详情
          </Text>
        </Pressable>
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
