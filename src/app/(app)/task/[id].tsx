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
import { ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TaskWithNodes, TaskNode, TASK_COLORS } from '@/types/types';
import {
  fetchTaskById,
  updateTask,
  deleteTask,
  addNode,
  deleteNode,
  updateNodeTitle,
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

// ─── 任务详情页 ───────────────────────────────────────────
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<TaskWithNodes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingNode, setAddingNode] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editColor, setEditColor] = useState(TASK_COLORS[0]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeText, setEditingNodeText] = useState('');
  const [newNodeText, setNewNodeText] = useState('');
  const [showAddNode, setShowAddNode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const newNodeInputRef = useRef<TextInput>(null);
  const nodeInputRef = useRef<TextInput>(null);
  const deleteConfirmAnim = useSharedValue(0);

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchTaskById(id);
      if (data) {
        setTask(data);
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
    setSaving(true); setErrorMsg(''); setSuccessMsg('');
    try {
      await updateTask(task.id, { title: editTitle.trim(), note: editNote.trim(), color: editColor });
      await loadTask();
      setSuccessMsg('已保存');
      setTimeout(() => setSuccessMsg(''), 1500);
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
    setAddingNode(true); setErrorMsg(''); setSuccessMsg('');
    try {
      await addNode(task.id, newNodeText.trim(), task.nodes.length);
      setNewNodeText(''); setShowAddNode(false);
      await loadTask();
      setSuccessMsg('节点已添加');
      setTimeout(() => setSuccessMsg(''), 1500);
    } catch (e) {
      setErrorMsg('添加节点失败，请重试');
      console.error('添加节点失败', e);
    } finally { setAddingNode(false); }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!task) return;
    if (task.nodes.length <= 1) { setErrorMsg('至少需要保留一个节点'); return; }
    setErrorMsg(''); setSuccessMsg('');
    try {
      await deleteNode(nodeId);
      await updateTaskProgress(task.id, Math.min(task.progress_position, 1));
      await loadTask();
    } catch (e) { console.error('删除节点失败', e); }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    setDeleting(true); setErrorMsg('');
    try {
      await deleteTask(task.id);
      router.back();
    } catch (e) {
      setErrorMsg('删除失败，请重试');
      console.error('删除任务失败', e);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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
  const step = task.nodes.length > 1 ? 1 / (task.nodes.length - 1) : 1;

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
          {successMsg !== '' && (
            <Text className="text-sm font-glow-sans-sc mt-1 mb-2" style={{ color: accentColor }}>{successMsg}</Text>
          )}

          {/* ── 节点列表 ── */}
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <SectionHeader label="任务节点" />
              <Pressable
                onPress={() => { setShowAddNode(true); setTimeout(() => newNodeInputRef.current?.focus(), 80); }}
                className="flex-row items-center gap-1"
              >
                <Plus size={14} color={accentColor} />
                <Text className="text-xs font-glow-sans-sc" style={{ color: accentColor }}>添加</Text>
              </Pressable>
            </View>

            {task.nodes.map((node, idx) => {
              const nodePos = idx * step;
              const isCompleted = nodePos <= task.progress_position + 0.001;
              const isEditing = editingNodeId === node.id;

              return (
                <View
                  key={node.id}
                  className="flex-row items-center mb-2 py-3 px-4 rounded-2xl"
                  style={{
                    backgroundColor: isCompleted ? `${accentColor}0D` : '#F8F9FB',
                    borderCurve: 'continuous',
                  }}
                >
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
                      onChangeText={setEditingNodeText}
                      onBlur={handleSaveNodeTitle}
                      onSubmitEditing={handleSaveNodeTitle}
                      returnKeyType="done"
                      className="flex-1 text-sm font-glow-sans-sc text-foreground"
                      autoFocus
                    />
                  ) : (
                    <Pressable
                      className="flex-1"
                      onPress={() => {
                        setEditingNodeId(node.id);
                        setEditingNodeText(node.title);
                        setTimeout(() => nodeInputRef.current?.focus(), 50);
                      }}
                    >
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
                    <Pressable onPress={() => handleDeleteNode(node.id)} className="ml-2 p-1">
                      <X size={15} color="#D1D5DB" />
                    </Pressable>
                  )}
                </View>
              );
            })}

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
                <Pressable onPress={handleAddNode} disabled={addingNode} className="ml-2 p-1">
                  {addingNode ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <Check size={16} color={accentColor} />
                  )}
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
                  disabled={deleting}
                  className="flex-1 py-3 rounded-2xl items-center flex-row justify-center gap-2"
                  style={{ backgroundColor: '#EF4444', borderCurve: 'continuous', opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting && <ActivityIndicator size="small" color="#FFFFFF" />}
                  <Text className="text-sm font-glow-sans-sc text-white font-medium">
                    {deleting ? '删除中…' : '确认删除'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
