/**
 * 垂直场景任务模板（增长方案 P1-1）
 *
 * 只存数据，导入统一走 createTask（一次写入任务 + 节点）。
 * 选品原则：模板必须是"天然的流程"——有明确先后顺序、能分阶段推进，
 * 这样滑条式进度才有意义，也更容易在视频里被一眼看懂。
 */
export interface TaskTemplate {
  id: string;
  title: string;
  note: string;
  color: string;
  /** 模板选择列表里的一句话卖点 */
  desc: string;
  /** 节点标题（即流程步骤，顺序即推进顺序） */
  nodes: string[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'exam-60d',
    title: '考研 60 天冲刺',
    note: '每天推进一格，滑到底就是上岸',
    color: '#6366F1',
    desc: '6 个阶段，从基础扫盲到冲刺背诵',
    nodes: [
      '基础扫盲 15 天',
      '强化刷题 15 天',
      '真题演练 10 天',
      '错题复盘 10 天',
      '全真模拟 5 天',
      '冲刺背诵 5 天',
    ],
  },
  {
    id: 'project-launch',
    title: '项目从 0 到上线',
    note: '一个节点 = 一个里程碑',
    color: '#10B981',
    desc: '需求到上线的 6 个关键里程碑',
    nodes: ['需求澄清', '方案设计', '开发实现', '联调测试', '灰度发布', '正式上线'],
  },
  {
    id: 'fitness-12w',
    title: '12 周健身计划',
    note: '每次训练推进一格',
    color: '#F97316',
    desc: '12 周分成 6 段，循序渐进不受伤',
    nodes: [
      '第 1-2 周 · 适应期',
      '第 3-4 周 · 基础期',
      '第 5-6 周 · 增肌期',
      '第 7-8 周 · 强化期',
      '第 9-10 周 · 塑形期',
      '第 11-12 周 · 冲刺期',
    ],
  },
];

export function getTemplate(id: string): TaskTemplate | null {
  return TASK_TEMPLATES.find((t) => t.id === id) ?? null;
}
