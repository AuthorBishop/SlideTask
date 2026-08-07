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
const DEMO_PROGRESS = 0.5; // 4 个节点，进度到第 2 个

const TRACK_HEIGHT = 12;
const DOT_DIAMETER = 20;
const DOT_RADIUS = DOT_DIAMETER / 2;
const CONTAINER_HEIGHT = 90;
const TRACK_CENTER_Y = CONTAINER_HEIGHT / 2;
const TRACK_TOP = TRACK_CENTER_Y - TRACK_HEIGHT / 2;
const DOT_TOP = TRACK_CENTER_Y - DOT_RADIUS;
const ABOVE_BOTTOM = DOT_TOP - 6;
const BELOW_TOP = DOT_TOP + DOT_DIAMETER + 6;

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
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#1F2937',
            fontFamily: 'System',
          }}
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

      {/* 进度条 + 节点区域 */}
      <View style={{ height: CONTAINER_HEIGHT }}>
        {/* 上方标签 */}
        {DEMO_NODES.map((node, i) => {
          const pos = i * (1 / (nodeCount - 1));
          const completed = pos <= DEMO_PROGRESS + 0.001;
          const isFirst = i === 0;
          const isLast = i === nodeCount - 1;
          const isAbove = i % 2 === 0;
          if (!isAbove) return null;

          return (
            <View
              key={`above-${node.id}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: ABOVE_BOTTOM,
                ...(isFirst
                  ? { left: 0, width: 80 }
                  : isLast
                  ? { right: 0, width: 80 }
                  : { left: `${pos * 100}%`, width: 80, marginLeft: -40 }),
                justifyContent: 'flex-end',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 11,
                  color: completed ? DEMO_COLOR : '#9CA3AF',
                  fontWeight: completed ? '500' : '400',
                  fontFamily: 'System',
                  textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                }}
              >
                {node.title}
              </Text>
            </View>
          );
        })}

        {/* 轨道 */}
        <View
          style={{
            position: 'absolute',
            top: TRACK_TOP,
            left: 0,
            right: 0,
            height: TRACK_HEIGHT,
            backgroundColor: '#E5E7EB',
            borderRadius: TRACK_HEIGHT / 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${DEMO_PROGRESS * 100}%`,
              height: TRACK_HEIGHT,
              backgroundColor: DEMO_COLOR,
              borderRadius: TRACK_HEIGHT / 2,
            }}
          />
        </View>

        {/* 节点圆点 */}
        {DEMO_NODES.map((node, i) => {
          const pos = i * (1 / (nodeCount - 1));
          const completed = pos <= DEMO_PROGRESS + 0.001;
          const isFirst = i === 0;
          const isLast = i === nodeCount - 1;

          return (
            <View
              key={`dot-${node.id}`}
              style={{
                position: 'absolute',
                top: DOT_TOP,
                width: DOT_DIAMETER,
                height: DOT_DIAMETER,
                borderRadius: DOT_RADIUS,
                borderWidth: 2.5,
                borderColor: completed ? DEMO_COLOR : '#D1D5DB',
                backgroundColor: completed ? DEMO_COLOR : '#FFFFFF',
                ...(isFirst
                  ? { left: 0 }
                  : isLast
                  ? { right: 0 }
                  : { left: `${pos * 100}%`, marginLeft: -DOT_RADIUS }),
              }}
            />
          );
        })}

        {/* 下方标签 */}
        {DEMO_NODES.map((node, i) => {
          const pos = i * (1 / (nodeCount - 1));
          const completed = pos <= DEMO_PROGRESS + 0.001;
          const isFirst = i === 0;
          const isLast = i === nodeCount - 1;
          const isBelow = i % 2 === 1;
          if (!isBelow) return null;

          return (
            <View
              key={`below-${node.id}`}
              style={{
                position: 'absolute',
                top: BELOW_TOP,
                height: 28,
                ...(isFirst
                  ? { left: 0, width: 80 }
                  : isLast
                  ? { right: 0, width: 80 }
                  : { left: `${pos * 100}%`, width: 80, marginLeft: -40 }),
                justifyContent: 'flex-start',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 11,
                  color: completed ? DEMO_COLOR : '#9CA3AF',
                  fontWeight: completed ? '500' : '400',
                  fontFamily: 'System',
                  textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                }}
              >
                {node.title}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 说明提示 */}
      <Text
        className="text-center mt-2"
        style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'System' }}
      >
        这是示例任务，创建你的第一个任务后会自动消失
      </Text>
    </View>
  );
}
