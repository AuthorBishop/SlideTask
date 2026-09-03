import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Dumbbell, GraduationCap, Rocket, X } from 'lucide-react-native';
import { TASK_TEMPLATES, TaskTemplate } from '@/lib/templates';
import { createTaskFromTemplate } from '@/db/api';

/** 模板图标（按模板 id 映射，避免在数据层引入 UI 依赖） */
const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'exam-60d': <GraduationCap size={18} color="#FFFFFF" />,
  'project-launch': <Rocket size={18} color="#FFFFFF" />,
  'fitness-12w': <Dumbbell size={18} color="#FFFFFF" />,
};

interface TemplatePickerModalProps {
  visible: boolean;
  /** 跳过 / 关闭（父层决定是否写入完成标记） */
  onClose: () => void;
  /** 模板已成功导入为任务（父层负责刷新列表） */
  onImported: () => void;
}

export default function TemplatePickerModal({
  visible,
  onClose,
  onImported,
}: TemplatePickerModalProps) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const slideAnim = useSharedValue(360);
  const bgAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      bgAnim.value = withTiming(1, { duration: 240 });
      slideAnim.value = withSpring(0, { damping: 22, stiffness: 180 });
    } else {
      bgAnim.value = withTiming(0, { duration: 200 });
      slideAnim.value = withTiming(360, { duration: 220 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: bgAnim.value * 0.35,
  }));

  const handlePick = async (tpl: TaskTemplate) => {
    if (saving) return;
    setErrorMsg('');
    setSaving(true);
    try {
      const id = await createTaskFromTemplate(tpl.id);
      if (!id) {
        setErrorMsg('模板不存在，请重试');
        return;
      }
      onImported();
      onClose();
    } catch (e) {
      console.error('导入模板失败', e);
      setErrorMsg('创建失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
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
          {/* 顶部把手 */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>

          {/* 标题栏 */}
          <View className="flex-row items-center justify-between px-5 py-3">
            <View className="flex-1">
              <Text className="text-lg font-glow-sans-sc text-foreground font-semibold">
                选一个模板开始
              </Text>
              <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-0.5">
                节点已拆好，导入后直接拖动推进
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-1.5">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {TASK_TEMPLATES.map((tpl) => (
              <Pressable
                key={tpl.id}
                onPress={() => handlePick(tpl)}
                disabled={saving}
                className="flex-row items-center rounded-2xl px-4 py-3.5 mb-3"
                style={{ backgroundColor: `${tpl.color}12`, opacity: saving ? 0.6 : 1 }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: tpl.color }}
                >
                  {TEMPLATE_ICONS[tpl.id]}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-glow-sans-sc text-foreground font-medium">
                    {tpl.title}
                  </Text>
                  <Text className="text-xs font-glow-sans-sc text-muted-foreground mt-0.5">
                    {tpl.desc}
                  </Text>
                </View>
                <Text className="text-xs font-glow-sans-sc text-muted-foreground">
                  {tpl.nodes.length} 步
                </Text>
              </Pressable>
            ))}

            {errorMsg !== '' && (
              <Text className="text-sm font-glow-sans-sc text-destructive mb-2">{errorMsg}</Text>
            )}
          </ScrollView>

          {/* 跳过：自己从空白创建 */}
          <View className="px-5 pt-3 pb-8">
            <Pressable onPress={onClose} className="w-full items-center py-3">
              <Text className="text-sm font-glow-sans-sc text-muted-foreground">
                跳过，我自己创建
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
