import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

interface DemoTaskCardProps {
  onDismiss: () => void;
}

const DEMO_COLOR = '#6366F1';
const DEMO_TITLE = '示例：整理本周工作安排';
const DEMO_NODES = [
  { id: 'd1', title: '收集需求', position: 0 },
  { id: 'd2', title: '拆解任务', position: 1 },
  { id: 'd3', title: '分配执行', position: 2 },
  { id: 'd4', title: '检查验收', position: 3 },
];
const DEMO_PROGRESS = 0.5; // 4个节点，完成到第2个

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function DemoTaskCard({ onDismiss }: DemoTaskCardProps) {
  const nodeCount = DEMO_NODES.length;
  const bgColor = hexToRgba(DEMO_COLOR, 0.08);

  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderRadius: 16,
        borderCurve: 'continuous',
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 16,
        opacity: 0.55,
        borderWidth: 1,
        borderColor: hexToRgba(DEMO_COLOR, 0.15),
        borderStyle: 'dashed',
      }}
    >
      {/* 标题行 + 消除按钮 */}
      <View className="flex-row items-center justify-between mb-4">
        <Text
          style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', fontFamily: 'System' }}
        >
          {DEMO_TITLE}
        </Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
        >
          <X size={12} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* 进度条 */}
      <View style={{ height: 48, justifyContent: 'center' }}>
        {/* 轨道 */}
        <View
          style={{
            height: 12,
            backgroundColor: '#E8E8ED',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {/* 填充 */}
          <View
            style={{
              width: `${DEMO_PROGRESS * 100}%`,
              height: 12,
              backgroundColor: DEMO_COLOR,
              borderRadius: 6,
            }}
          />
        </View>

        {/* 节点圆点 + 标签 */}
        {DEMO_NODES.map((node, i) => {
          const pos = i * (1 / (nodeCount - 1));
          const completed = pos <= DEMO_PROGRESS + 0.001;
          const isFirst = i === 0;
          const isLast = i === nodeCount - 1;
          const dotSize = 20;

          return (
            <View key={node.id}>
              {/* 圆点 */}
              <View
                style={{
                  position: 'absolute',
                  top: -4, // aligned: center of 12px track = 6px, dot center = 10px
                  ...(isFirst
                    ? { left: -dotSize / 2 }
                    : isLast
                    ? { right: -dotSize / 2 }
                    : { left: `${pos * 100}%`, marginLeft: -dotSize / 2 }),
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  borderWidth: 2.5,
                  borderColor: completed ? 'rgba(0,0,0,0.15)' : '#D1D5DB',
                  backgroundColor: completed ? DEMO_COLOR : '#FFFFFF',
                }}
              />
              {/* 标签 */}
              <Text
                style={{
                  position: 'absolute',
                  top: i % 2 === 0 ? -22 : 18,
                  left: isFirst ? 0 : isLast ? undefined : `${pos * 100}%`,
                  right: isLast ? 0 : undefined,
                  width: 64,
                  marginLeft: isFirst ? 0 : isLast ? 0 : -32,
                  fontSize: 11,
                  color: completed ? DEMO_COLOR : '#9CA3AF',
                  fontWeight: completed ? '500' : '400',
                  fontFamily: 'System',
                  textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                }}
                numberOfLines={1}
              >
                {node.title}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 说明提示 */}
      <Text
        className="text-center mt-3"
        style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'System' }}
      >
        这是示例任务，创建你的第一个任务后会自动消失
      </Text>
    </View>
  );
}
