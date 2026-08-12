import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TaskCard from './TaskCard';
import { TaskWithNodes } from '@/types/types';

// 模拟数据：结构与真实 TaskWithNodes 完全一致
const DEMO_TASK: TaskWithNodes = {
  id: '__demo__',
  title: '示例：整理本周工作安排',
  note: '',
  color: '#6366F1',
  progress_position: 0.5,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  nodes: [
    { id: 'demo_n1', task_id: '__demo__', title: '收集需求', position: 0, created_at: new Date().toISOString() },
    { id: 'demo_n2', task_id: '__demo__', title: '分析整理', position: 1, created_at: new Date().toISOString() },
    { id: 'demo_n3', task_id: '__demo__', title: '分配执行', position: 2, created_at: new Date().toISOString() },
    { id: 'demo_n4', task_id: '__demo__', title: '检查验收', position: 3, created_at: new Date().toISOString() },
  ],
};

interface DemoTaskCardProps {
  onDismiss?: () => void;
}

export default function DemoTaskCard({ onDismiss }: DemoTaskCardProps) {
  return (
    <View style={styles.wrapper}>
      {/* 虚线边框容器 */}
      <View style={styles.dashedBorder}>
        <View style={styles.padding}>
          {/* 复用真实 TaskCard，只读模式：禁用拖拽/编辑/完成/详情 */}
          <TaskCard
            task={DEMO_TASK}
            onUpdate={() => {}}
            onOpenDetail={() => {}}
            readOnly
          />
        </View>

        {/* 提示文本 */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintArrow}>↑</Text>
          <Text style={styles.hintText}>
            这是示例卡片，你可以拖动把手调整进度，点击标签编辑名称
          </Text>
        </View>
      </View>

      {/* 关闭按钮 */}
      {onDismiss && (
        <View style={styles.dismissContainer}>
          <Text
            style={styles.dismissText}
            onPress={onDismiss}
          >
            知道了，不再显示
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  dashedBorder: {
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    overflow: 'hidden',
  },
  padding: {
    padding: 10,
  },
  hintContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hintArrow: {
    fontSize: 12,
    color: '#818CF8',
    marginRight: 6,
    lineHeight: 18,
  },
  hintText: {
    fontSize: 12,
    color: '#6366F1',
    lineHeight: 18,
    flex: 1,
  },
  dismissContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  dismissText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
});
