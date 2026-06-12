/**
 * 本地 SQLite 数据访问层
 * 所有操作均通过 dbReady Promise 串行，零网络延迟
 */
import { dbReady, newId } from '@/lib/database';
import { Task, TaskNode, TaskWithNodes } from '@/types/types';

// ─── 任务列表（含节点）─────────────────────────────────────
// 按 order_index DESC 排序（值越大越靠前），保证每次返回顺序完全一致
export async function fetchTasksWithNodes(): Promise<TaskWithNodes[]> {
  const db = await dbReady;

  const tasks = await db.getAllAsync<Task>(
    `SELECT * FROM tasks ORDER BY order_index DESC LIMIT 200`
  );
  if (tasks.length === 0) return [];

  const placeholders = tasks.map(() => '?').join(',');
  const taskIds = tasks.map((t) => t.id);
  const nodes = await db.getAllAsync<TaskNode>(
    `SELECT * FROM task_nodes WHERE task_id IN (${placeholders}) ORDER BY position ASC`,
    taskIds
  );

  return tasks.map((t) => ({
    ...t,
    nodes: nodes.filter((n) => n.task_id === t.id),
  }));
}

// ─── 单个任务（含节点）────────────────────────────────────
export async function fetchTaskById(id: string): Promise<TaskWithNodes | null> {
  const db = await dbReady;
  const task = await db.getFirstAsync<Task>(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (!task) return null;

  const nodes = await db.getAllAsync<TaskNode>(
    `SELECT * FROM task_nodes WHERE task_id = ? ORDER BY position ASC`,
    [id]
  );
  return { ...task, nodes };
}

// ─── 创建任务 ─────────────────────────────────────────────
// order_index 用当前最大值 +1 保证新任务排在最前
export async function createTask(
  title: string,
  color: string,
  note: string,
  nodesTitles: string[]
): Promise<string> {
  const db = await dbReady;
  const id = newId();
  const now = new Date().toISOString();

  const maxRow = await db.getFirstAsync<{ max_idx: number | null }>(
    `SELECT MAX(order_index) AS max_idx FROM tasks`
  );
  const orderIndex = (maxRow?.max_idx ?? 0) + 1;

  await db.runAsync(
    `INSERT INTO tasks (id, title, note, color, progress_position, order_index, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [id, title.trim(), note.trim(), color, orderIndex, now]
  );

  const filtered = nodesTitles.filter((t) => t.trim() !== '');
  for (let i = 0; i < filtered.length; i++) {
    await db.runAsync(
      `INSERT INTO task_nodes (id, task_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)`,
      [newId(), id, filtered[i].trim(), i, now]
    );
  }

  return id;
}

// ─── 更新任务基本信息 ─────────────────────────────────────
export async function updateTask(
  id: string,
  fields: Partial<Pick<Task, 'title' | 'note' | 'color' | 'progress_position'>>
): Promise<void> {
  const db = await dbReady;
  const sets: string[] = [];
  const vals: (string | number)[] = [];

  if (fields.title !== undefined) { sets.push('title = ?'); vals.push(fields.title.trim()); }
  if (fields.note !== undefined) { sets.push('note = ?'); vals.push(fields.note.trim()); }
  if (fields.color !== undefined) { sets.push('color = ?'); vals.push(fields.color); }
  if (fields.progress_position !== undefined) { sets.push('progress_position = ?'); vals.push(fields.progress_position); }

  if (sets.length === 0) return;
  vals.push(id);
  await db.runAsync(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, vals);
}

// ─── 更新进度位置 ─────────────────────────────────────────
export async function updateTaskProgress(id: string, progress: number): Promise<void> {
  const db = await dbReady;
  const clamped = Math.max(0, Math.min(1, progress));
  await db.runAsync(`UPDATE tasks SET progress_position = ? WHERE id = ?`, [clamped, id]);
}

// ─── 删除任务（节点通过 CASCADE 自动删除）────────────────
export async function deleteTask(id: string): Promise<void> {
  const db = await dbReady;
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
}

// ─── 更新节点标题 ─────────────────────────────────────────
export async function updateNodeTitle(nodeId: string, title: string): Promise<void> {
  const db = await dbReady;
  await db.runAsync(`UPDATE task_nodes SET title = ? WHERE id = ?`, [title.trim(), nodeId]);
}

// ─── 添加节点 ─────────────────────────────────────────────
export async function addNode(taskId: string, title: string, position: number): Promise<TaskNode> {
  const db = await dbReady;
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO task_nodes (id, task_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, taskId, title.trim(), position, now]
  );
  return { id, task_id: taskId, title: title.trim(), position, created_at: now };
}

// ─── 删除节点 ─────────────────────────────────────────────
export async function deleteNode(nodeId: string): Promise<void> {
  const db = await dbReady;
  await db.runAsync(`DELETE FROM task_nodes WHERE id = ?`, [nodeId]);
}

// ─── 批量更新节点顺序（保留接口，兼容旧调用）─────────────
export async function reorderNodes(nodes: Pick<TaskNode, 'id' | 'position'>[]): Promise<void> {
  const db = await dbReady;
  for (const n of nodes) {
    await db.runAsync(`UPDATE task_nodes SET position = ? WHERE id = ?`, [n.position, n.id]);
  }
}
