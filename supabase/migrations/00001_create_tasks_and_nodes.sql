
-- 任务表
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  note text DEFAULT '',
  color text NOT NULL DEFAULT '#6366F1',
  progress_position numeric NOT NULL DEFAULT 0, -- 0.0 ~ 1.0，进度条位置
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 节点表
CREATE TABLE task_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0, -- 节点在进度条上的顺序
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_nodes ENABLE ROW LEVEL SECURITY;

-- 无登录场景：任何人可对tasks做所有操作
CREATE POLICY "allow_all_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_task_nodes" ON task_nodes FOR ALL USING (true) WITH CHECK (true);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 插入演示数据
INSERT INTO tasks (id, title, color, progress_position, note) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', '产品设计迭代', '#6366F1', 0.35, '本次迭代聚焦交互优化与视觉统一'),
  ('a1b2c3d4-0000-0000-0000-000000000002', '年度报告撰写', '#10B981', 0.6, '需在月底前完成终稿'),
  ('a1b2c3d4-0000-0000-0000-000000000003', '健身计划执行', '#F59E0B', 0.15, '每周三次，持续三个月');

INSERT INTO task_nodes (task_id, title, position) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', '需求整理', 0),
  ('a1b2c3d4-0000-0000-0000-000000000001', '原型设计', 1),
  ('a1b2c3d4-0000-0000-0000-000000000001', '视觉稿输出', 2),
  ('a1b2c3d4-0000-0000-0000-000000000001', '开发联调', 3),
  ('a1b2c3d4-0000-0000-0000-000000000001', '测试上线', 4),

  ('a1b2c3d4-0000-0000-0000-000000000002', '数据收集', 0),
  ('a1b2c3d4-0000-0000-0000-000000000002', '数据分析', 1),
  ('a1b2c3d4-0000-0000-0000-000000000002', '初稿撰写', 2),
  ('a1b2c3d4-0000-0000-0000-000000000002', '内部审阅', 3),
  ('a1b2c3d4-0000-0000-0000-000000000002', '终稿提交', 4),

  ('a1b2c3d4-0000-0000-0000-000000000003', '制定计划', 0),
  ('a1b2c3d4-0000-0000-0000-000000000003', '热身阶段', 1),
  ('a1b2c3d4-0000-0000-0000-000000000003', '进阶训练', 2),
  ('a1b2c3d4-0000-0000-0000-000000000003', '体能测试', 3),
  ('a1b2c3d4-0000-0000-0000-000000000003', '目标达成', 4);
