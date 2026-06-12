// 任务与节点类型定义
export interface TaskNode {
  id: string;
  task_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  note: string;
  color: string;
  progress_position: number; // 0.0 ~ 1.0
  created_at: string;
  updated_at: string;
  nodes?: TaskNode[];
}

export interface TaskWithNodes extends Task {
  nodes: TaskNode[];
}

// 预设任务颜色
export const TASK_COLORS = [
  '#6366F1', // 靛蓝
  '#10B981', // 翠绿
  '#F59E0B', // 琥珀
  '#EF4444', // 珊瑚红
  '#8B5CF6', // 紫罗兰
  '#06B6D4', // 天蓝
  '#F97316', // 橙色
  '#EC4899', // 玫瑰粉
];
