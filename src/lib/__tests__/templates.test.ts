// 垂直场景任务模板数据校验
import { TASK_TEMPLATES, getTemplate } from '@/lib/templates';
import { TASK_COLORS } from '@/types/types';

describe('TASK_TEMPLATES — 模板数据完整性', () => {
  it('内置至少 3 个模板且 id 全局唯一', () => {
    expect(TASK_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    const ids = TASK_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每个模板字段完整：标题/备注/描述/节点均非空', () => {
    for (const t of TASK_TEMPLATES) {
      expect(t.title.trim()).not.toBe('');
      expect(t.note.trim()).not.toBe('');
      expect(t.desc.trim()).not.toBe('');
      expect(t.nodes.length).toBeGreaterThanOrEqual(2);
      expect(t.nodes.every((n) => n.trim() !== '')).toBe(true);
    }
  });

  it('模板颜色均来自预设任务色集合（列表色可控）', () => {
    for (const t of TASK_TEMPLATES) {
      expect(TASK_COLORS).toContain(t.color);
    }
  });

  it('getTemplate 命中返回模板、未命中返回 null', () => {
    expect(getTemplate(TASK_TEMPLATES[0].id)).toBe(TASK_TEMPLATES[0]);
    expect(getTemplate('not-exist')).toBeNull();
  });
});
