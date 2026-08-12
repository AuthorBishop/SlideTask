import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
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
import { useConfirm } from '@/ctx/confirm';

interface TaskCardProps {
  task: TaskWithNodes;
  onUpdate: () => void;
  onOpenDetail: (taskId: string) => void;
  readOnly?: boolean;
  /** 隐藏右上角「详情」和「完成」按钮（用于示例预览等场景） */
  hideActions?: boolean;
  /** 自定义进度保存（替代数据库 API，如示例数据只存本地） */
  onSaveProgress?: (value: number) => void | Promise<void>;
  /** 自定义节点标题保存（替代数据库 API，如示例数据只存本地） */
  onSaveNodeTitle?: (nodeId: string, title: string) => void | Promise<void>;
}

const LABEL_MAX_WIDTH = 80;
const TRACK_HEIGHT = 15; // 轨道高度（压缩）
const NODE_DOT_R = 12;
const HANDLE_SIZE = 26;
const LABEL_ROWS = 3; // 节点文字最多显示3行
const MIN_LABEL_FONT_SIZE = 12; // 横向受限时忽略放大，收敛到的基准字号
const NARROW_SLOT_THRESHOLD = 72; // 文字框宽度低于此值视为"横向空间明显受限"
const NARROW_TITLE_ROW_WIDTH = 380; // 屏幕宽度低于此值（窄屏）时，备注移到标题行下方整行显示（RN 中等价 CSS 媒体查询断点）
const LABEL_DOT_GAP = 0; // 上方节点标签到圆点的间距
const LABEL_MARGIN = 0; // 标签区域边距（去掉，压缩高度）
const TRACK_GAP = 4; // 下方节点标签到轨道的间距（压缩，与上方视觉一致）





export default function TaskCard({
  task,
  onUpdate,
  onOpenDetail,
  readOnly,
  hideActions,
  onSaveProgress,
  onSaveNodeTitle,
}: TaskCardProps) {
  const { nodes, color, note } = task;
  const nodeCount = nodes.length;
  const step = nodeCount > 1 ? 1 / (nodeCount - 1) : 1;

  const { fontSize: LABEL_FONT_SIZE } = useFontSize();
  const { showConfirm } = useConfirm();
  const { width: windowWidth } = useWindowDimensions();
  const TITLE_FONT_SIZE = LABEL_FONT_SIZE + 4; // 标题比节点标签大4号
  // 窄屏判定（RN 无 CSS 媒体查询，用窗口宽度等价实现）：宽度不足时备注无法与标题/按钮并排
  const noteOnOwnLine = note.trim() !== '' && windowWidth < NARROW_TITLE_ROW_WIDTH;

  const [progress, setProgress] = useState(task.progress_position);
  const [barWidth, setBarWidth] = useState(0);

  // 每个文字框可用宽度：多节点受节点间距限制，单节点为整条轨道
  const labelSlotWidth = nodeCount > 1
    ? Math.min(LABEL_MAX_WIDTH, barWidth / (nodeCount - 1))
    : barWidth;
  // 横向空间明显受限时，标签忽略字体放大设置、收敛到基准字号，优先展示更多文字内容
  const labelFontSize = labelSlotWidth < NARROW_SLOT_THRESHOLD
    ? Math.min(LABEL_FONT_SIZE, MIN_LABEL_FONT_SIZE)
    : LABEL_FONT_SIZE;
  const LINE_HEIGHT = labelFontSize + 5;
  const ABOVE_HEIGHT = LINE_HEIGHT * LABEL_ROWS + LABEL_MARGIN + LABEL_DOT_GAP;
  // 下方标签：与上方高度一致
  const BELOW_HEIGHT = LINE_HEIGHT * LABEL_ROWS + LABEL_MARGIN + LABEL_DOT_GAP;
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
        if (onSaveProgress) {
          await onSaveProgress(val);
        } else {
          await updateTaskProgress(task.id, val);
        }
      } catch (e) {
        console.error('保存进度失败', e);
      }
    },
    [task.id, onSaveProgress]
  );

  // ── 手动激活拖动手势（方向意图实时判定）──
  //
  // 检测逻辑设计：
  // 1. 手动激活 (manualActivation)：触摸后不自动激活，由 onTouchesMove 实时判定意图。
  // 2. 单点触控 (maxPointers=1)：超过一根手指时立即拒绝。
  // 3. 方向意图判定 (onTouchesMove)：
  //    - 横向位移 > 8px 且横向 > 纵向 → 立即激活拖拽（零延迟响应）
  //    - 纵向位移 > 8px 且纵向 > 横向 → 判定为滚动意图，手势失败释放
  //    - 位移不足 8px 时持续等待，谁先越过阈值按谁执行
  const startX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const handleScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .manualActivation()             // ① 手动激活：由 onTouchesMove 控制激活/失败
    .maxPointers(1)                  // ② 禁止多点触控
    .onTouchesMove((e, stateManager) => {
      'worklet';
      // ③ 方向意图判定：根据起始位移方向决定激活拖拽还是放弃（交给 ScrollView）
      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);
      // 横向先越过阈值且占优 → 拖拽意图
      if (absX > 8 && absX > absY) {
        stateManager.activate();
      }
      // 纵向先越过阈值且占优 → 滚动意图 → 释放手势
      else if (absY > 8 && absY > absX) {
        stateManager.fail();
      }
    })
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      handleScale.value = 1.25; // 略放大，视觉反馈"已抓取"
      startX.value = dragProgress.value * barWidth;
    })
    .onUpdate((e) => {
      'worklet';
      if (barWidth <= 0) return;
      const newX = Math.max(0, Math.min(barWidth, startX.value + e.translationX));
      dragProgress.value = newX / barWidth;
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      handleScale.value = 1;
      runOnJS(saveProgress)(dragProgress.value);
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      handleScale.value = 1;
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

  // 把手抓取时的缩放反馈（防误触机制：只有真正激活拖动时才放大）
  const handleScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: handleScale.value }],
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
      if (onSaveNodeTitle) {
        await onSaveNodeTitle(editingNodeId, trimmed);
      } else {
        await updateNodeTitle(editingNodeId, trimmed);
      }
    } catch (e) {
      console.error('保存节点标题失败', e);
      setLocalTitles((prev) => ({
        ...prev,
        [editingNodeId]: nodes.find((n) => n.id === editingNodeId)?.title ?? prev[editingNodeId],
      }));
    }
  }, [editingNodeId, editingText, nodes, onSaveNodeTitle]);

  const startEditNode = useCallback((nodeId: string, currentTitle: string) => {
    setEditingNodeId(nodeId);
    setEditingText(currentTitle);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, []);

  // 轨道几何计算（基于动态 LINE_HEIGHT）
  const TRACK_CENTER_Y = ABOVE_HEIGHT + NODE_DOT_R;
  const DOT_TOP = TRACK_CENTER_Y - NODE_DOT_R;
  const TRACK_TOP = TRACK_CENTER_Y - TRACK_HEIGHT / 2;
  // 多节点：上方标签 + 圆点 + 轨道 + 间距 + 下方标签
  const CONTAINER_HEIGHT = ABOVE_HEIGHT + NODE_DOT_R * 2 + TRACK_HEIGHT + TRACK_GAP + BELOW_HEIGHT;
  // 单节点：无需下方标签空间，紧凑布局
  const SINGLE_NODE_HEIGHT = ABOVE_HEIGHT + NODE_DOT_R + TRACK_HEIGHT + 4;

  const bgColor = hexToRgba(color, 0.08);

  // 完成确认弹窗
  const handleComplete = useCallback(async () => {
    const confirmed = await showConfirm({
      title: '确认完成',
      message: `确认完成任务「${task.title}」吗？\n完成后将移至已完成列表。`,
      confirmText: '确认完成',
      cancelText: '取消',
      confirmColor: color,
    });
    if (!confirmed) return;
    try {
      await completeTask(task.id);
      onUpdate();
    } catch (e) {
      console.error('完成任务失败', e);
    }
  }, [task.id, task.title, onUpdate, showConfirm, color]);

  return (
    <View
      style={{ borderCurve: 'continuous', backgroundColor: bgColor, borderRadius: 16 }}
      className="px-4 py-2 mb-2"
    >
      {/* ── 任务标题行 ── */}
      <View className="flex-row items-end" style={{ marginBottom: 0 }}>
        <Text
          style={{ fontSize: TITLE_FONT_SIZE, fontFamily: 'System', fontWeight: '600', color: '#1F2937', lineHeight: TITLE_FONT_SIZE + 2 }}
          className="flex-shrink"
        >
          {task.title}
        </Text>
        {/* 备注：横向空间充足时与标题并排（flex-1 填充标题与按钮之间） */}
        {note.trim() !== '' && !noteOnOwnLine && (
          <Text
            className="text-xs font-sans text-muted-foreground ml-2 flex-1"
            style={{ lineHeight: TITLE_FONT_SIZE + 2 }}
          >
            {note.trim()}
          </Text>
        )}
        {/* 右上角：详情按钮（只读或隐藏操作时隐藏） */}
        {!readOnly && !hideActions && (
          <Pressable
            onPress={() => onOpenDetail(task.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}18`, marginLeft: 8 }}
          >
            <Text
              className="text-xs font-sans font-medium"
              style={{ color }}
            >
              详情
            </Text>
          </Pressable>
        )}
        {/* 完成按钮（打勾，只读或隐藏操作时隐藏） */}
        {!readOnly && !hideActions && (
          <Pressable
            onPress={handleComplete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 8 }}
          >
            <CheckCircle size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {/* 备注：窄屏时移到详情/打勾按钮下方整行显示，保持文字横向 */}
      {noteOnOwnLine && (
        <Text
          className="text-xs font-sans text-muted-foreground mt-1"
          style={{ lineHeight: TITLE_FONT_SIZE + 2 }}
        >
          {note.trim()}
        </Text>
      )}

      {/* ── 进度条容器 ── */}
      <View
        style={{ height: nodeCount === 1 ? SINGLE_NODE_HEIGHT : CONTAINER_HEIGHT, position: 'relative' }}
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
                left: 0,
                maxWidth: barWidth,
                // zIndex:5 介于轨道(0)与拖动把手(10)之间，避免编辑态被手柄覆盖
                zIndex: isEditing ? 6 : 1,
                elevation: isEditing ? 6 : 1,
                // 编辑态与显示态共用同一几何（top+height 确定，避免 bottom 锚定在 Web 端塌缩）
                ...{ top: 0, height: ABOVE_HEIGHT, justifyContent: 'flex-end' },
              }}
            >
              {isEditing ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <TextInput
                    ref={editInputRef}
                    value={editingText}
                    onChangeText={setEditingText}
                    onBlur={saveNodeTitle}
                    onSubmitEditing={saveNodeTitle}
                    returnKeyType="done"
                    multiline
                    style={{
                      flex: 1,
                      fontSize: labelFontSize,
                      lineHeight: LINE_HEIGHT,
                      color: '#374151',
                      borderBottomWidth: 1,
                      borderBottomColor: color,
                      paddingBottom: 1,
                      fontFamily: 'System',
                      paddingVertical: 0,
                      paddingHorizontal: 0,
                      includeFontPadding: false,
                      // 自适应高度：至少一行，最多4行（超出滚动），取消固定两行限制
                      minHeight: LINE_HEIGHT,
                      maxHeight: LINE_HEIGHT * 4,
                      textAlignVertical: 'top',
                    }}
                    autoFocus
                  />
                  <Pressable
                    onPress={saveNodeTitle}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      marginLeft: 8,
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* 浅灰圆底 + 透明外圆 + 彩色勾，确保勾轮廓清晰、对比度高 */}
                    <CheckCircle size={20} color={color} fill="transparent" strokeWidth={2.5} />
                  </Pressable>
                </View>
              ) : readOnly ? (
                <Text
                  style={{ fontSize: labelFontSize, color, fontFamily: 'System', fontWeight: '500', lineHeight: LINE_HEIGHT }}
                  numberOfLines={LABEL_ROWS}
                >
                  {displayTitle}
                </Text>
              ) : (
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); startEditNode(node.id, displayTitle); }}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text
                    style={{ fontSize: labelFontSize, color, fontFamily: 'System', fontWeight: '500', lineHeight: LINE_HEIGHT }}
                    numberOfLines={LABEL_ROWS}
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
                  borderWidth: 3,
                  borderColor: isCompleted ? 'rgba(0,0,0,0.15)' : '#D1D5DB',
                  backgroundColor: isCompleted ? color : '#FFFFFF',
                }}
              />

              {/* 节点标签 */}
              <View
                style={{
                  position: 'absolute',
                  left: labelLeft,
                  width: isEditing ? Math.max(dynamicMaxWidth, 200) : dynamicMaxWidth,
                  // 编辑态提升到 Layer 3 (手柄) 之上，避免输入框被拖动手柄覆盖
                  zIndex: isEditing ? 20 : 1,
                  elevation: isEditing ? 20 : 1,
                  // 编辑态与显示态共用同一几何：上方 top+height 确定（避免 bottom 锚定在 Web 端塌缩），下方 top 锚定
                  ...(isAbove
                    ? { top: 0, height: ABOVE_HEIGHT, justifyContent: 'flex-end' }
                    : { top: TRACK_CENTER_Y + NODE_DOT_R + TRACK_GAP, height: BELOW_HEIGHT, justifyContent: 'flex-start' }),
                }}
              >
                {isEditing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <TextInput
                      ref={editInputRef}
                      value={editingText}
                      onChangeText={setEditingText}
                      onBlur={saveNodeTitle}
                      onSubmitEditing={saveNodeTitle}
                      returnKeyType="done"
                      multiline
                      style={{
                        flex: 1,
                        fontSize: labelFontSize,
                        lineHeight: LINE_HEIGHT,
                        color: '#374151',
                        borderBottomWidth: 1,
                        borderBottomColor: color,
                        paddingBottom: 1,
                        fontFamily: 'System',
                        paddingVertical: 0,
                        paddingHorizontal: 0,
                        includeFontPadding: false,
                        // 自适应高度：至少一行，最多4行（超出滚动），取消固定两行限制
                        minHeight: LINE_HEIGHT,
                        maxHeight: LINE_HEIGHT * 4,
                        textAlignVertical: 'top',
                      }}
                      autoFocus
                    />
                    <Pressable
                      onPress={saveNodeTitle}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        marginLeft: 8,
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: '#F1F5F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* 浅灰圆底 + 透明外圆 + 彩色勾，确保勾轮廓清晰、对比度高 */}
                      <CheckCircle size={20} color={color} fill="transparent" strokeWidth={2.5} />
                    </Pressable>
                  </View>
                ) : readOnly ? (
                  <Text
                    style={{
                      fontSize: labelFontSize,
                      lineHeight: LINE_HEIGHT,
                      color: isCompleted ? color : '#9CA3AF',
                      fontFamily: 'System',
                      fontWeight: isCompleted ? '500' : '400',
                      textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                    }}
                    numberOfLines={LABEL_ROWS}
                  >
                    {displayTitle}
                  </Text>
                ) : (
                  <Pressable
                    onPress={(e) => { e.stopPropagation?.(); startEditNode(node.id, displayTitle); }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: labelFontSize,
                        lineHeight: LINE_HEIGHT,
                        color: isCompleted ? color : '#9CA3AF',
                        fontFamily: 'System',
                        fontWeight: isCompleted ? '500' : '400',
                        textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                      }}
                      numberOfLines={LABEL_ROWS}
                    >
                      {displayTitle}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* ── 第3层：可拖动的进度把手（只读模式隐藏）── */}
        {barWidth > 0 && !readOnly && (
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
                handleScaleStyle,
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
