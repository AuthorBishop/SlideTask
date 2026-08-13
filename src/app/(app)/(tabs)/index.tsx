import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Eye, Plus, Sparkles, Compass, Type, X } from 'lucide-react-native';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchTasksWithNodes } from '@/db/api';
import { getSetting, setSetting } from '@/lib/database';
import { TaskWithNodes } from '@/types/types';
import TaskCard from '@/components/tasks/TaskCard';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import OnboardingScreen from '@/components/onboarding/OnboardingScreen';
import DemoTaskCard from '@/components/tasks/DemoTaskCard';
import { useFontSize, FONT_SIZE_LABELS } from '@/ctx/fontSize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text as UIText } from '@/components/ui/text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 空状态迷你进度条：轨道 + 往返移动的把手 + 节点圆点实时点亮，让空页面本身演示核心交互
function EmptyStateProgress() {
  // 动画进度：0 → 1 → 0 无限往返（进度语义"拖过来再拉回去"）
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [progress]);

  // 迷你轨道几何
  const BAR_W = 168;
  const BAR_H = 10;
  const DOT_R = 8;
  const HANDLE = 18;
  const NODES = 4; // 演示 4 个节点
  const dotTop = BAR_H / 2 - DOT_R;

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const handleStyle = useAnimatedStyle(() => {
    const marginLeftPx = progress.value * BAR_W - HANDLE / 2;
    return { marginLeft: marginLeftPx };
  });

  return (
    <View
      className="items-center justify-center mb-8"
      style={{ width: BAR_W + DOT_R * 2, height: DOT_R * 2 }}
    >
      {/* 轨道（含填充） */}
      <View
        style={{
          position: 'absolute',
          top: BAR_H / 2 - BAR_H / 2,
          left: DOT_R,
          width: BAR_W,
          height: BAR_H,
          borderRadius: BAR_H / 2,
          backgroundColor: '#E8E8ED',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            fillStyle,
            {
              height: BAR_H,
              backgroundColor: '#6366F1',
              borderRadius: BAR_H / 2,
            },
          ]}
        />
      </View>

      {/* 节点圆点：随把手位置实时点亮 */}
      {Array.from({ length: NODES }).map((_, i) => {
        const pos = i * (1 / (NODES - 1));
        return <EmptyStateNodeDot key={i} left={DOT_R + pos * BAR_W - DOT_R} top={dotTop} progress={progress} pos={pos} />;
      })}

      {/* 往返把手 */}
      <Animated.View
        style={[
          handleStyle,
          {
            position: 'absolute',
            top: BAR_H / 2 - HANDLE / 2,
            left: DOT_R,
            width: HANDLE,
            height: HANDLE,
            borderRadius: HANDLE / 2,
            backgroundColor: '#FFFFFF',
            borderWidth: 2.5,
            borderColor: '#6366F1',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View
          style={{
            width: HANDLE - 6,
            height: HANDLE - 6,
            borderRadius: (HANDLE - 6) / 2,
            backgroundColor: '#6366F1',
          }}
        />
      </Animated.View>
    </View>
  );
}

// 单个节点圆点：进度越过该节点时点亮（未完成白底灰边，完成时任务色实心）
function EmptyStateNodeDot({
  left,
  top,
  progress,
  pos,
}: {
  left: number;
  top: number;
  progress: SharedValue<number>;
  pos: number;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const done = progress.value >= pos - 0.001;
    return {
      borderColor: withTiming(done ? 'rgba(0,0,0,0.15)' : '#D1D5DB', { duration: 120 }),
      backgroundColor: withTiming(done ? '#6366F1' : '#FFFFFF', { duration: 120 }),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        dotStyle,
        {
          position: 'absolute',
          left,
          top,
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2.5,
        },
      ]}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithNodes[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showGuidePreview, setShowGuidePreview] = useState(false);
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const { level, label, nextLevel } = useFontSize();

  // 引导页状态
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    getSetting('onboarding_completed').then((val) => {
      if (val !== '1') setShowOnboarding(true);
      setOnboardingChecked(true);
    });
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await setSetting('onboarding_completed', '1');
    setShowOnboarding(false);
  }, []);

  // 示例任务：检查 hide_demo 设置，true=已隐藏
  const [hideDemo, setHideDemo] = useState(false);

  useEffect(() => {
    getSetting('hide_demo').then((v) => { if (v === '1') setHideDemo(true); });
  }, []);

  const handleDismissDemo = useCallback(async () => {
    await setSetting('hide_demo', '1');
    setHideDemo(true);
  }, []);

  // CTA 脉冲动画：无真实任务且未隐藏示例 → 延时 5 秒开始脉冲
  const canPulse = tasks.length === 0 && !hideDemo;
  const [pulseActive, setPulseActive] = useState(false);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (canPulse) {
      const timer = setTimeout(() => setPulseActive(true), 5000);
      return () => clearTimeout(timer);
    }
    setPulseActive(false);
  }, [canPulse]);

  useEffect(() => {
    if (pulseActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1);
      pulseOpacity.value = withTiming(1);
    }
  }, [pulseActive]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasksWithNodes(false); // 只加载进行中的任务
      setTasks(data);
    } catch (e) {
      console.error('加载任务失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const handleOpenDetail = (taskId: string) => {
    router.push(`/(app)/task/${taskId}`);
  };

  // 引导页未检查完成 → 加载中
  if (!onboardingChecked) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  // 首次启动 → 显示引导页
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* 顶部标题区 */}
      <View className="px-5 pt-4 pb-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-glow-sans-sc text-foreground font-semibold tracking-tight">
              流程
            </Text>
            <Text className="text-sm font-glow-sans-sc text-muted-foreground mt-1">
              {tasks.length > 0 ? `${tasks.length} 个进行中` : '开始管理你的任务'}
            </Text>
          </View>
          {/* 开发预览 + 已完成入口 */}
          <View className="flex-row items-center gap-2">
            {__DEV__ && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Pressable
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="flex-row items-center gap-1.5 px-4 py-2 rounded-full"
                    style={{ backgroundColor: '#F3F4F6' }}
                  >
                    <Eye size={14} color="#6B7280" />
                    <Text className="text-sm font-glow-sans-sc" style={{ color: '#6B7280' }}>
                      预览
                    </Text>
                  </Pressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6}>
                  <DropdownMenuLabel>开发预览</DropdownMenuLabel>
                  <DropdownMenuItem onPress={() => setShowGuidePreview(true)}>
                    <Icon as={Compass} className="text-muted-foreground size-4" />
                    <UIText>查看引导页</UIText>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={() => setShowDemoPreview(true)}>
                    <Icon as={Sparkles} className="text-muted-foreground size-4" />
                    <UIText>查看示例</UIText>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Pressable
              onPress={() => router.push('/(app)/completed')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <Text className="text-sm font-glow-sans-sc" style={{ color: '#6B7280' }}>
                已完成
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 任务列表 */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onUpdate={loadTasks}
              onOpenDetail={handleOpenDetail}
            />
          )}
          ListEmptyComponent={
            !hideDemo ? (
              <View>
                <DemoTaskCard onDismiss={handleDismissDemo} />
                <View className="items-center justify-center pt-6">
                  <EmptyStateProgress />
                  <Text className="text-base font-glow-sans-sc text-foreground text-center mb-1">
                    暂无任务
                  </Text>
                  <Text className="text-sm font-glow-sans-sc text-muted-foreground text-center">
                    点击右下角 + 创建第一个任务
                  </Text>
                </View>
              </View>
            ) : (
              <View className="items-center justify-center pt-24 px-8">
                <EmptyStateProgress />
                <Text className="text-base font-glow-sans-sc text-foreground text-center mb-1">
                  暂无任务
                </Text>
                <Text className="text-sm font-glow-sans-sc text-muted-foreground text-center">
                  点击右下角 + 创建第一个任务
                </Text>
              </View>
            )
          }
        />
      )}

      {/* 字体大小调节按钮 */}
      <Pressable
        onPress={nextLevel}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: 'rgba(17,24,39,0.10)' }],
        }}
      >
        <Type size={18} color="#6B7280" />
        <Text
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            backgroundColor: '#111827',
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: '700',
            fontFamily: 'System',
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderRadius: 6,
            overflow: 'hidden',
            minWidth: 16,
            textAlign: 'center',
          }}
        >
          {FONT_SIZE_LABELS[level]}
        </Text>
      </Pressable>

      {/* 新建任务浮动按钮（带脉冲动画） */}
      <AnimatedPressable
        onPress={() => setShowCreate(true)}
        style={[
          pulseStyle,
          {
            position: 'absolute',
            bottom: 36,
            right: 24,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#111827',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(17,24,39,0.18)' }],
          },
        ]}
      >
        <Plus size={22} color="#FFFFFF" strokeWidth={2} />
      </AnimatedPressable>

      {/* 新建任务弹窗 */}
      <CreateTaskModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadTasks}
      />

      {/* 开发预览：引导页（与首次体验完全一致，onComplete 只关闭弹窗、不写完成标记） */}
      <Modal
        visible={showGuidePreview}
        animationType="fade"
        onRequestClose={() => setShowGuidePreview(false)}
      >
        <OnboardingScreen onComplete={() => setShowGuidePreview(false)} />
      </Modal>

      {/* 开发预览：示例任务（只读展示，不隐藏示例） */}
      <Modal
        visible={showDemoPreview}
        animationType="fade"
        onRequestClose={() => setShowDemoPreview(false)}
      >
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-3xl font-glow-sans-sc text-foreground font-semibold tracking-tight">
              示例任务
            </Text>
            <Pressable
              onPress={() => setShowDemoPreview(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <X size={16} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* key 随弹窗开关变化：每次打开都挂载全新示例数据；
                onDismiss 只关闭弹窗，不写 hide_demo，与首页示例卡 UI 完全一致 */}
            <DemoTaskCard
              key={showDemoPreview ? 'demo-open' : 'demo-closed'}
              onDismiss={() => setShowDemoPreview(false)}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
