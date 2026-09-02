import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, RefreshCw, Shuffle, X } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { fetchTasksWithNodes } from '@/db/api';
import { setTodayFocus, setFocusMode } from '@/utils/focus';
import { TaskWithNodes } from '@/types/types';

const SPIN_TICK_MS = 90; // 洗牌切换间隔
const SPIN_DURATION_MS = 1200; // 洗牌总时长

export default function PickScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithNodes[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [preview, setPreview] = useState<TaskWithNodes | null>(null);
  const [result, setResult] = useState<TaskWithNodes | null>(null);
  // 已抽过集合：换一个时避免立刻重复；全部抽过一轮则重置
  const drawnRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 结果卡回弹动画
  const resultScale = useSharedValue(0.8);
  const resultOpacity = useSharedValue(0);
  const resultStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultOpacity.value,
  }));

  useEffect(() => {
    fetchTasksWithNodes(false)
      .then(setTasks)
      .catch((e) => console.error('加载任务失败', e))
      .finally(() => setLoading(false));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startSpin = useCallback(() => {
    if (tasks.length === 0 || timerRef.current) return;
    setPhase('spinning');
    setResult(null);
    resultScale.value = 0.8;
    resultOpacity.value = 0;

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += SPIN_TICK_MS;
      // 洗牌中快速切换随机任务（允许重复闪现，仅定格时不重复）
      const flash = tasks[Math.floor(Math.random() * tasks.length)];
      setPreview(flash);

      if (elapsed >= SPIN_DURATION_MS) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // 定格：从"未抽过"里随机；全部抽完一轮则重置池
        let pool = tasks.filter((t) => !drawnRef.current.has(t.id));
        if (pool.length === 0) {
          drawnRef.current.clear();
          pool = tasks;
        }
        const picked = pool[Math.floor(Math.random() * pool.length)];
        drawnRef.current.add(picked.id);
        setPreview(picked);
        setResult(picked);
        setPhase('result');
        resultScale.value = withSequence(
          withTiming(1.12, { duration: 160 }),
          withSpring(1, { damping: 12, stiffness: 220 }),
        );
        resultOpacity.value = withTiming(1, { duration: 200 });
      }
    }, SPIN_TICK_MS);
  }, [tasks, resultScale, resultOpacity]);

  const handlePick = useCallback(() => {
    if (phase === 'result' && result) {
      // 设为今日焦点并开启专注模式：回到首页即进入"单任务专注"视图
      void (async () => {
        await setTodayFocus(result.id);
        await setFocusMode(true);
        router.back();
      })();
    }
  }, [phase, result, router]);

  const renderTaskBlock = (task: TaskWithNodes, dim: boolean) => (
    <View className="w-full items-center">
      <View
        className="w-14 h-14 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: `${task.color}22` }}
      >
        <View className="w-7 h-7 rounded-full" style={{ backgroundColor: task.color }} />
      </View>
      <Text
        numberOfLines={3}
        className={`text-xl font-glow-sans-sc text-foreground font-semibold text-center px-6 ${dim ? 'opacity-80' : ''}`}
      >
        {task.title}
      </Text>
      {task.nodes.length > 0 && (
        <Text className="text-sm font-glow-sans-sc text-muted-foreground mt-2">
          {task.nodes.length} 个节点
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* 顶部标题栏 */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-3xl font-glow-sans-sc text-foreground font-semibold tracking-tight">
          帮我选一个
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F3F4F6' }}
        >
          <X size={18} color="#374151" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : tasks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#EEF2FF' }}>
            <Shuffle size={26} color="#6366F1" />
          </View>
          <Text className="text-base font-glow-sans-sc text-foreground font-medium text-center">
            暂时没有可抽取的任务
          </Text>
          <Text className="text-sm font-glow-sans-sc text-muted-foreground text-center mt-2 leading-5">
            先创建几个进行中的任务，再回来让随机帮你决定先做哪个。
          </Text>
        </View>
      ) : (
        <View className="flex-1 justify-between px-5 pb-8 pt-4">
          {/* 说明与抽取区 */}
          <View className="items-center">
            <Text className="text-sm font-glow-sans-sc text-muted-foreground mb-8">
              从 {tasks.length} 个进行中任务里随机抽 1 个
            </Text>

            {/* 抽取展示区 */}
            <View className="w-full min-h-[220px] items-center justify-center">
              {phase === 'idle' && (
                <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                  <Shuffle size={32} color="#6366F1" />
                </View>
              )}
              {phase === 'spinning' && preview && renderTaskBlock(preview, true)}
              {phase === 'result' && result && (
                <Animated.View style={resultStyle} className="w-full items-center">
                  {renderTaskBlock(result, false)}
                  <View className="mt-5 flex-row items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${result.color}1A` }}>
                    <Check size={13} color={result.color} strokeWidth={3} />
                    <Text className="text-xs font-glow-sans-sc font-medium" style={{ color: result.color }}>
                      就做它
                    </Text>
                  </View>
                </Animated.View>
              )}
            </View>
          </View>

          {/* 底部操作区 */}
          <View className="w-full gap-3">
            {phase === 'result' && result && (
              <Pressable
                onPress={handlePick}
                className="w-full h-13 py-4 rounded-2xl items-center justify-center"
                style={{ backgroundColor: result.color }}
              >
                <Text className="text-base font-glow-sans-sc text-white font-semibold">
                  就做这个，设为今日焦点
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={startSpin}
              disabled={phase === 'spinning'}
              className={`w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 ${
                phase === 'spinning' ? 'opacity-60' : ''
              }`}
              style={phase === 'result' && result ? { backgroundColor: '#F3F4F6' } : { backgroundColor: '#111827' }}
            >
              {phase === 'result' && result ? (
                <RefreshCw size={17} color="#374151" />
              ) : (
                <Shuffle size={17} color={phase === 'spinning' ? '#9CA3AF' : '#FFFFFF'} />
              )}
              <Text
                className="text-base font-glow-sans-sc font-semibold"
                style={{ color: phase === 'result' && result ? '#374151' : '#FFFFFF' }}
              >
                {phase === 'result' ? '换一个' : phase === 'spinning' ? '抽取中…' : '开始抽取'}
              </Text>
            </Pressable>
            <Text className="text-xs font-glow-sans-sc text-muted-foreground text-center">
              随时可以退出，不想要就换一个
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
