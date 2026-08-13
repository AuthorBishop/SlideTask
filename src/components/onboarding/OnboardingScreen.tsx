import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import { ListChecks, ChevronsRight, Settings2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DemoTaskCard from '@/components/tasks/DemoTaskCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideData {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** 该页嵌入可交互组件（如可拖动的示例任务卡片）以替代静态图标 */
  interactive?: boolean;
}

const slides: SlideData[] = [
  {
    icon: <ListChecks size={48} color="#6366F1" />,
    title: '把任务拆成步骤',
    description: '将复杂任务拆分为有序节点，每一步都清晰可见，不再一头雾水。',
  },
  {
    icon: <ChevronsRight size={48} color="#6366F1" />,
    title: '拖拽进度条追踪进展',
    description: '用手指拖动进度条，每完成一步填满一格，享受推进感带来的动力。',
    interactive: true,
  },
  {
    icon: <Settings2 size={48} color="#6366F1" />,
    title: '个性化你的任务流',
    description: '8 种标记颜色区分任务类型，字体大小随心调节，让任务管理更舒适。',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatlistRef = useRef<FlatList<SlideData>>(null);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setActiveIndex(idx);
    },
    []
  );

  const handleNext = useCallback(() => {
    if (activeIndex < slides.length - 1) {
      // 直接滚动到下一屏偏移量（scrollToIndex 在 react-native-web 上依赖 getItemLayout 常失效）
      flatlistRef.current?.scrollToOffset({
        offset: SCREEN_WIDTH * (activeIndex + 1),
        animated: true,
      });
    } else {
      onComplete();
    }
  }, [activeIndex, onComplete]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* 跳过按钮：始终占位，保持三页顶部间距一致；最后一页隐藏但保留布局高度 */}
      <View className="items-end px-6 pt-4">
        <Pressable
          onPress={onComplete}
          disabled={activeIndex === slides.length - 1}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ opacity: activeIndex < slides.length - 1 ? 1 : 0 }}
        >
          <Text className="text-sm font-sans text-muted-foreground">跳过</Text>
        </Pressable>
      </View>

      {/* 引导内容 */}
      <View className="flex-1 justify-center">
        <FlatList
          ref={flatlistRef}
          data={slides}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          bounces={false}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item }) => (
            <View
              style={{ width: SCREEN_WIDTH }}
              className="items-center justify-center px-10"
            >
              {/* 交互页：嵌入真实可拖动的示例任务卡片，亲手拖动一次即建立"滑动=进度"语义 */}
              {item.interactive ? (
                <View className="w-full mb-8">
                  <DemoTaskCard />
                </View>
              ) : (
                /* 图标容器 */
                <View
                  className="w-28 h-28 rounded-full items-center justify-center mb-10"
                  style={{ backgroundColor: '#F5F3FF' }}
                >
                  {item.icon}
                </View>
              )}

              {/* 标题 */}
              <Text className="text-2xl font-glow-sans-sc text-foreground font-semibold text-center mb-3">
                {item.title}
              </Text>

              {/* 描述 */}
              <Text className="text-base font-sans text-muted-foreground text-center leading-6">
                {item.description}
              </Text>
            </View>
          )}
        />
      </View>

      {/* 底部控制区 */}
      <View className="items-center pb-10 px-6">
        {/* 指示器 */}
        <View className="flex-row gap-2 mb-8">
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === activeIndex ? '#6366F1' : '#D1D5DB',
              }}
            />
          ))}
        </View>

        {/* 操作按钮 */}
        <Pressable
          onPress={handleNext}
          className="w-full py-4 rounded-2xl items-center"
          style={{ backgroundColor: '#111827' }}
        >
          <Text className="text-base font-glow-sans-sc text-white font-medium">
            {activeIndex === slides.length - 1 ? '开始体验' : '下一页'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
