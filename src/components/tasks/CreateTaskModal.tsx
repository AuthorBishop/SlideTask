import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { X, Plus, Minus } from 'lucide-react-native';
import { TASK_COLORS } from '@/types/types';
import { createTask } from '@/db/api';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTaskModal({ visible, onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(TASK_COLORS[0]);
  const [nodes, setNodes] = useState(['', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const slideAnim = useSharedValue(300);
  const bgAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      bgAnim.value = withTiming(1, { duration: 240 });
      slideAnim.value = withSpring(0, { damping: 22, stiffness: 180 });
    } else {
      bgAnim.value = withTiming(0, { duration: 200 });
      slideAnim.value = withTiming(300, { duration: 220 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: bgAnim.value * 0.35,
  }));

  const handleAddNode = () => setNodes((n) => [...n, '']);
  const handleRemoveNode = (idx: number) => {
    if (nodes.length <= 1) return;
    setNodes((n) => n.filter((_, i) => i !== idx));
  };
  const handleNodeChange = (idx: number, val: string) => {
    setNodes((n) => n.map((v, i) => (i === idx ? val : v)));
  };

  const handleCreate = async () => {
    setErrorMsg('');
    if (!title.trim()) {
      setErrorMsg('任务名称不能为空');
      return;
    }
    const validNodes = nodes.filter((n) => n.trim() !== '');
    if (validNodes.length < 1) {
      setErrorMsg('至少需要添加一个节点');
      return;
    }
    setSaving(true);
    try {
      await createTask(title, selectedColor, note, validNodes);
      // 重置表单
      setTitle('');
      setNote('');
      setNodes(['', '']);
      setSelectedColor(TASK_COLORS[0]);
      setErrorMsg('');
      onCreated();
      onClose();
    } catch (e) {
      setErrorMsg('创建失败，请重试');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* 半透明遮罩 */}
        <Animated.View
          style={[
            overlayStyle,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#111827',
            },
          ]}
        />
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        {/* 底部弹窗 */}
        <Animated.View
          style={[
            sheetStyle,
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '88%',
            },
          ]}
        >
          <KeyboardAvoidingView behavior="padding">
            {/* 顶部把手 */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-border" />
            </View>

            {/* 标题栏 */}
            <View className="flex-row items-center justify-between px-5 py-3">
              <Text className="text-lg font-glow-sans-sc text-foreground font-semibold">
                新建任务
              </Text>
              <Pressable onPress={onClose} className="p-1.5">
                <X size={20} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView
              className="px-5"
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* 任务名称 */}
              <Text className="text-xs font-glow-sans-sc text-muted-foreground mb-1.5 mt-1">
                任务名称
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="给任务起个名字…"
                placeholderTextColor="#9CA3AF"
                className="w-full text-base font-glow-sans-sc text-foreground bg-secondary rounded-xl px-4 py-3 mb-4"
                returnKeyType="next"
              />

              {/* 颜色选择 */}
              <Text className="text-xs font-glow-sans-sc text-muted-foreground mb-2">
                颜色标识
              </Text>
              <View className="flex-row flex-wrap gap-3 mb-4">
                {TASK_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: c,
                      borderWidth: selectedColor === c ? 3 : 0,
                      borderColor: '#FFFFFF',
                      shadowColor: c,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: selectedColor === c ? 0.5 : 0,
                      shadowRadius: 4,
                      elevation: selectedColor === c ? 4 : 0,
                    }}
                  />
                ))}
              </View>

              {/* 备注 */}
              <Text className="text-xs font-glow-sans-sc text-muted-foreground mb-1.5">
                备注（可选）
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="添加一些说明…"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                className="w-full text-sm font-glow-sans-sc text-foreground bg-secondary rounded-xl px-4 py-3 mb-4"
                style={{ textAlignVertical: 'top', minHeight: 60 }}
              />

              {/* 节点列表 */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-glow-sans-sc text-muted-foreground">
                  任务节点
                </Text>
                <Pressable onPress={handleAddNode} className="flex-row items-center gap-1">
                  <Plus size={14} color="#6366F1" />
                  <Text className="text-xs font-glow-sans-sc" style={{ color: '#6366F1' }}>
                    添加节点
                  </Text>
                </Pressable>
              </View>

              {nodes.map((n, idx) => (
                <View key={idx} className="flex-row items-center mb-2.5">
                  {/* 序号 */}
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center mr-3 flex-shrink-0"
                    style={{ backgroundColor: `${selectedColor}20` }}
                  >
                    <Text className="text-xs font-glow-sans-sc" style={{ color: selectedColor }}>
                      {idx + 1}
                    </Text>
                  </View>
                  <TextInput
                    value={n}
                    onChangeText={(v) => handleNodeChange(idx, v)}
                    placeholder={`第 ${idx + 1} 步…`}
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 text-sm font-glow-sans-sc text-foreground bg-secondary rounded-xl px-3.5 py-2.5"
                    returnKeyType="next"
                  />
                  {nodes.length > 1 && (
                    <Pressable onPress={() => handleRemoveNode(idx)} className="ml-2 p-1">
                      <Minus size={16} color="#9CA3AF" />
                    </Pressable>
                  )}
                </View>
              ))}

              {/* 错误提示 */}
              {errorMsg !== '' && (
                <Text className="text-sm font-glow-sans-sc text-destructive mt-1 mb-2">
                  {errorMsg}
                </Text>
              )}

              {/* 创建按钮 */}
              <Pressable
                onPress={handleCreate}
                disabled={saving}
                className="w-full rounded-2xl py-4 mt-2 items-center"
                style={{ backgroundColor: selectedColor, opacity: saving ? 0.7 : 1 }}
              >
                <Text className="text-base font-glow-sans-sc text-white font-medium">
                  {saving ? '创建中…' : '创建任务'}
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}
