import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Check, X, GripVertical } from 'lucide-react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TaskWithNodes, TaskNode, TASK_COLORS } from '@/types/types';
import {
  fetchTaskById,
  updateTask,
  deleteTask,
  addNode,
  deleteNode,
  updateNodeTitle,
  reorderNodes,
  updateTaskProgress,
} from '@/db/api';

// ─── 辅助组件：区块标题 ──────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="text-xs font-glow-sans-sc text-muted-foreground uppercase tracking-widest mb-3">
      {label}
    </Text>
  );
}

// ─── 可拖拽节点行（独立组件，确保 Hooks 合法调用）────────
interface DraggableNodeRowProps {
  node: TaskNode;
  idx: number;
  totalNodes: number;
  progressPosition: number;
  isEditing: boolean;
  accentColor: string;
  onPressEdit: () => void;
  onDelete: () => void;
  onLayout: (idx: number, y: number, height: number) => void;
  editingNodeText: string;
  onChangeEditText: (t: string) => void;
  onSaveNodeTitle: () => void;
  nodeInputRef: React.RefObject<TextInput | null>;
  onDragStart: (idx: number) => void;
  onDragUpdate: (translationY: number) => void;
  onDragEnd: (idx: number, translationY: number) => void;
  isDragging: boolean;
  dragTranslateY: number;
}

function DraggableNodeRow({
  node, idx, totalNodes, progressPosition, isEditing,
  accentColor, onPressEdit, onDelete, onLayout,
  editingNodeText, onChangeEditText, onSaveNodeTitle, nodeInputRef,
  onDragStart, onDragUpdate, onDragEnd, isDragging, dragTranslateY,
}: DraggableNodeRowProps) {
  // Hooks 在子组件顶层合法调用
  const dragActive = useSharedValue(false);

  const step = totalNodes > 1 ? 1 / (totalNodes - 1) : 1;
  const nodePos = idx * step;
  const isCompleted = nodePos <= progressPosition + 0.001;

  const longPress = Gesture.LongPress()
    .minDuration(350)
    .onStart(() => {
      dragActive.value = true;
      runOnJS(onDragStart)(idx);
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (!dragActive.value) return;
      runOnJS(onDragUpdate)(e.translationY);
    })
    .onEnd((e) => {
      dragActive.value = false;
      runOnJS(onDragEnd)(idx, e.translationY);
    });

  const composedGesture = Gesture.Simultaneous(longPress, pan);

  return (
    <View
      className="flex-row items-center mb-2 py-3 px-4 rounded-2xl"
      style={{
        backgroundColor: isDragging ? '#FFFFFF' : isCompleted ? `${accentColor}0D` : '#F8F9FB',
        borderCurve: 'continuous',
        transform: isDragging ? [{ translateY: dragTranslateY }] : [],
        zIndex: isDragging ? 99 : 1,
        shadowColor: isDragging ? '#000' : 'transparent',
        shadowOffset: isDragging ? { width: 0, height: 6 } : { width: 0, height: 0 },
        shadowOpacity: isDragging ? 0.12 : 0,
        shadowRadius: isDragging ? 12 : 0,
        elevation: isDragging ? 8 : 0,
      }}
      onLayout={(e) => onLayout(idx, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
    >
      {/* 拖拽手柄 */}
      <GestureDetector gesture={composedGesture}>
        <View className="mr-2 p-1">
          <GripVertical size={16} color="#D1D5DB" />
        </View>
      </GestureDetector>

      {/* 状态指示圆 */}
      <View
        className="w-7 h-7 rounded-full items-center justify-center mr-3 flex-shrink-0"
        style={{ backgroundColor: isCompleted ? accentColor : '#E5E7EB' }}
      >
        {isCompleted ? (
          <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
        ) : (
          <Text className="text-xs font-glow-sans-sc text-muted-foreground">{idx + 1}</Text>
        )}
      </View>

      {/* 节点标题 */}
      {isEditing ? (
        <TextInput
          ref={nodeInputRef}
          value={editingNodeText}
          onChangeText={onChangeEditText}
          onBlur={onSaveNodeTitle}
          onSubmitEditing={onSaveNodeTitle}
          returnKeyType="done"
          className="flex-1 text-sm font-glow-sans-sc text-foreground"
          autoFocus
        />
      ) : (
        <Pressable className="flex-1" onPress={onPressEdit}>
          <Text
            className="text-sm font-glow-sans-sc"
            style={{ color: isCompleted ? accentColor : '#374151' }}
          >
            {node.title}
          </Text>
        </Pressable>
      )}

      {/* 删除 */}
      {!isEditing && (
        <Pressable onPress={onDelete} className="ml-2 p-1">
          <X size={15} color="#D1D5DB" />
        </Pressable>
      )}
    </View>
  );
}

// ─── 任务详情页 ───────────────────────────────────────────
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<TaskWithNodes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editColor, setEditColor] = useState(TASK_COLORS[0]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeText, setEditingNodeText] = useState('');
  const [newNodeText, setNewNodeText] = useState('');
  const [showAddNode, setShowAddNode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 节点拖拽排序
  const [localNodes, setLocalNodes] = useState<TaskNode[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragTranslateY, setDragTranslateY] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const nodeLayouts = useRef<{ y: number; height: number }[]>([]);

  const newNodeInputRef = useRef<TextInput>(null);
  const nodeInputRef = useRef<TextInput>(null);
  const deleteConfirmAnim = useSharedValue(0);

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchTaskById(id);
      if (data) {
        setTask(data);
        setLocalNodes(data.nodes);
        setEditTitle(data.title);
        setEditNote(data.note || '');
        setEditColor(data.color);
      }
    } catch (e) {
      console.error('加载任务失败', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadTask(); }, [loadTask]));

  const handleSaveBasic = async () => {
    if (!task || !editTitle.trim()) { setErrorMsg('任务名称不能为空'); return; }
    setSaving(true); setErrorMsg('');
    try {
      await updateTask(task.id, { title: editTitle.trim(), note: editNote.trim(), color: editColor });
      await loadTask();
    } catch (e) { setErrorMsg('保存失败，请重试'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleSaveNodeTitle = async () => {
    if (!editingNodeId || !editingNodeText.trim()) { setEditingNodeId(null); return; }
    try { await updateNodeTitle(editingNodeId, editingNodeText.trim()); await loadTask(); }
    catch (e) { console.error('保存节点失败', e); }
    setEditingNodeId(null);
  };

  const handleAddNode = async () => {
    if (!task || !newNodeText.trim()) return;
    try {
      await addNode(task.id, newNodeText.trim(), task.nodes.length);
      setNewNodeText(''); setShowAddNode(false); await loadTask();
    } catch (e) { console.error('添加节点失败', e); }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!task) return;
    if (localNodes.length <= 1) { setErrorMsg('至少需要保留一个节点'); return; }
    setErrorMsg('');
    try {
      await deleteNode(nodeId);
      const remaining = localNodes.filter((n) => n.id !== nodeId);
      // 仅重排 position，不碰 progress_position
      await reorderNodes(remaining.map((n, i) => ({ id: n.id, position: i })));
      await updateTaskProgress(task.id, Math.min(task.progress_position, 1));
      await loadTask();
    } catch (e) { console.error('删除节点失败', e); }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try { await deleteTask(task.id); router.back(); }
    catch (e) { console.error('删除任务失败', e); }
  };

  // ── 节点布局测量 ──────────────────────────────────────
  const handleNodeLayout = useCallback((idx: number, y: number, height: number) => {
    nodeLayouts.current[idx] = { y, height };
  }, []);

  // ── 计算拖拽目标位置 ──────────────────────────────────
  const computeTargetIdx = useCallback((fromIdx: number, translationY: number): number => {
    const layouts = nodeLayouts.current;
    if (!layouts[fromIdx]) return fromIdx;
    const fromCenter = layouts[fromIdx].y + layouts[fromIdx].height / 2 + translationY;
    let targetIdx = fromIdx;
    let minDist = Infinity;
    layouts.forEach((layout, i) => {
      if (!layout) return;
      const dist = Math.abs(fromCenter - (layout.y + layout.height / 2));
      if (dist < minDist) { minDist = dist; targetIdx = i; }
    });
    return targetIdx;
  }, []);

  // ── 拖拽回调（传入子组件）─────────────────────────────
  const handleDragStart = useCallback((idx: number) => {
    setDraggingIdx(idx);
    setDragTranslateY(0);
    setScrollEnabled(false);
  }, []);

  const handleDragUpdate = useCallback((translationY: number) => {
    setDragTranslateY(translationY);
  }, []);

  const handleDragEnd = useCallback(async (fromIdx: number, translationY: number) => {
    const toIdx = computeTargetIdx(fromIdx, translationY);
    setDraggingIdx(null);
    setDragTranslateY(0);
    setScrollEnabled(true);
    if (fromIdx === toIdx) return;

    const reordered = [...localNodes];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setLocalNodes(reordered); // 乐观更新

    try {
      // 仅更新节点 position，与进度条拖动完全隔离
      await reorderNodes(reordered.map((n, i) => ({ id: n.id, position: i })));
    } catch (e) {
      console.error('重排序保存失败，恢复原顺序', e);
      await loadTask();
    }
  }, [localNodes, computeTargetIdx, loadTask]);

  const deleteConfirmStyle = useAnimatedStyle(() => ({
    height: deleteConfirmAnim.value * 64,
    opacity: deleteConfirmAnim.value,
    overflow: 'hidden',
  }));

  const toggleDeleteConfirm = () => {
    const next = !showDeleteConfirm;
    setShowDeleteConfirm(next);
    deleteConfirmAnim.value = withTiming(next ? 1 : 0, { duration: 220 });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366F1" />
      </SafeAreaView>
    );
  }
  if (!task) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base font-glow-sans-sc text-muted-foreground text-center">任务不存在</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-sm font-glow-sans-sc" style={{ color: '#6366F1' }}>返回</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const accentColor = editColor;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* 顶部导航栏 */}
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()} className="p-1.5 mr-2">
            <ArrowLeft size={22} color="#111827" />
          </Pressable>
          <Text className="text-base font-glow-sans-sc text-foreground font-semibold flex-1" numberOfLines={1}>
            {task.title}
          </Text>
          {saving ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Pressable onPress={handleSaveBasic} className="px-3 py-1.5">
              <Text className="text-sm font-glow-sans-sc font-medium" style={{ color: accentColor }}>保存</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          className="flex-1"
          scrollEnabled={scrollEnabled}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 基本信息 ── */}
          <SectionHeader label="基本信息" />
          <Text className="text-xs font-glow-sans-sc text-muted-foreground mb-1.5">任务名称</Text>
          <TextInput
            value={editTitle} onChangeText={setEditTitle}
            placeholder="任务名称" placeholderTextColor="#9CA3AF"
            className="w-full text-base font-glow-sans-sc text-foreground bg-secondary rounded-xl px-4 py-3 mb-4"
            returnKeyType="next"
          />

          <Text className="text-xs font-glow-sans-sc text-muted-foreground mb-1.5">颜色标识</Text>
          <View className="flex-row flex-wrap gap-3 mb-4">
            {TASK_COLORS.map((c) => (
              <Pressable
                key={c} onPress={() => setEditColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: 14, backgroundColor: c,
                  borderWidth: editColor === c ? 3 : 0, borderColor: '#FFFFFF',
                  shadowColor: c, shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: editColor === c ? 0.5 : 0, shadowRadius: 4,
                  elevation: editColor === c ? 4 : 0,
                }}
              />
            ))}
          </View>

          <Text className="text-xs font-glow-sans-sc text-muted-foreground mb-1.5">备注</Text>
          <TextInput
            value={editNote} onChangeText={setEditNote}
            placeholder="添加备注说明…" placeholderTextColor="#9CA3AF"
            multiline numberOfLines={3}
            className="w-full text-sm font-glow-sans-sc text-foreground bg-secondary rounded-xl px-4 py-3 mb-1"
            style={{ textAlignVertical: 'top', minHeight: 72 }}
          />
          {errorMsg !== '' && (
            <Text className="text-sm font-glow-sans-sc text-destructive mt-1 mb-2">{errorMsg}</Text>
          )}

          {/* ── 节点管理 ── */}
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-1">
              <SectionHeader label="任务节点" />
              <Pressable
                onPress={() => { setShowAddNode(true); setTimeout(() => newNodeInputRef.current?.focus(), 80); }}
                className="flex-row items-center gap-1"
              >
                <Plus size={14} color={accentColor} />
                <Text className="text-xs font-glow-sans-sc" style={{ color: accentColor }}>添加</Text>
              </Pressable>
            </View>
            <Text className="text-xs font-glow-sans-sc text-muted-foreground mb-3">
              长按 ⠿ 可拖拽调整顺序
            </Text>

            {localNodes.map((node, idx) => (
              <DraggableNodeRow
                key={node.id}
                node={node}
                idx={idx}
                totalNodes={localNodes.length}
                progressPosition={task.progress_position}
                isEditing={editingNodeId === node.id}
                accentColor={accentColor}
                onPressEdit={() => {
                  setEditingNodeId(node.id);
                  setEditingNodeText(node.title);
                  setTimeout(() => nodeInputRef.current?.focus(), 50);
                }}
                onDelete={() => handleDeleteNode(node.id)}
                onLayout={handleNodeLayout}
                editingNodeText={editingNodeText}
                onChangeEditText={setEditingNodeText}
                onSaveNodeTitle={handleSaveNodeTitle}
                nodeInputRef={nodeInputRef}
                onDragStart={handleDragStart}
                onDragUpdate={handleDragUpdate}
                onDragEnd={handleDragEnd}
                isDragging={draggingIdx === idx}
                dragTranslateY={draggingIdx === idx ? dragTranslateY : 0}
              />
            ))}

            {showAddNode && (
              <View className="flex-row items-center mt-1 mb-2 py-3 px-4 rounded-2xl bg-secondary">
                <View
                  className="w-7 h-7 rounded-full items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <Plus size={14} color={accentColor} />
                </View>
                <TextInput
                  ref={newNodeInputRef} value={newNodeText} onChangeText={setNewNodeText}
                  placeholder="新节点名称…" placeholderTextColor="#9CA3AF"
                  className="flex-1 text-sm font-glow-sans-sc text-foreground"
                  returnKeyType="done" onSubmitEditing={handleAddNode}
                  onBlur={() => { if (!newNodeText.trim()) setShowAddNode(false); }}
                />
                <Pressable onPress={handleAddNode} className="ml-2 p-1">
                  <Check size={16} color={accentColor} />
                </Pressable>
              </View>
            )}
          </View>

          {/* ── 危险操作 ── */}
          <View className="mt-10">
            <Pressable
              onPress={toggleDeleteConfirm}
              className="flex-row items-center justify-center py-3.5 rounded-2xl"
              style={{ backgroundColor: '#FEF2F2', borderCurve: 'continuous' }}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text className="text-sm font-glow-sans-sc text-destructive ml-2">删除此任务</Text>
            </Pressable>

            <Animated.View style={deleteConfirmStyle}>
              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={toggleDeleteConfirm}
                  className="flex-1 py-3 rounded-2xl items-center bg-secondary"
                  style={{ borderCurve: 'continuous' }}
                >
                  <Text className="text-sm font-glow-sans-sc text-muted-foreground">取消</Text>
                </Pressable>
                <Pressable
                  onPress={handleDeleteTask}
                  className="flex-1 py-3 rounded-2xl items-center"
                  style={{ backgroundColor: '#EF4444', borderCurve: 'continuous' }}
                >
                  <Text className="text-sm font-glow-sans-sc text-white font-medium">确认删除</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
