import { supabase } from '@/client/supabase';
import { Task, TaskNode, TaskWithNodes } from '@/types/types';

// ─── 任务列表（含节点）─────────────────────────────────────
export async function fetchTasksWithNodes(): Promise<TaskWithNodes[]> {
  const { data: tasks, error: tErr } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (tErr) throw tErr;
  if (!tasks || tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id);
  const { data: nodes, error: nErr } = await supabase
    .from('task_nodes')
    .select('*')
    .in('task_id', taskIds)
    .order('position', { ascending: true });

  if (nErr) throw nErr;

  return tasks.map((t) => ({
    ...t,
    nodes: Array.isArray(nodes) ? nodes.filter((n) => n.task_id === t.id) : [],
  }));
}

// ─── 单个任务（含节点）────────────────────────────────────
export async function fetchTaskById(id: string): Promise<TaskWithNodes | null> {
  const { data: task, error: tErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (tErr) throw tErr;
  if (!task) return null;

  const { data: nodes, error: nErr } = await supabase
    .from('task_nodes')
    .select('*')
    .eq('task_id', id)
    .order('position', { ascending: true });

  if (nErr) throw nErr;

  return { ...task, nodes: Array.isArray(nodes) ? nodes : [] };
}

// ─── 创建任务 ─────────────────────────────────────────────
export async function createTask(
  title: string,
  color: string,
  note: string,
  nodesTitles: string[]
): Promise<string> {
  const { data: task, error: tErr } = await supabase
    .from('tasks')
    .insert({ title: title.trim(), color, note: note.trim(), progress_position: 0 })
    .select('id')
    .maybeSingle();

  if (tErr) throw tErr;
  if (!task) throw new Error('创建任务失败');

  const nodesPayload = nodesTitles
    .filter((t) => t.trim() !== '')
    .map((t, i) => ({ task_id: task.id, title: t.trim(), position: i }));

  if (nodesPayload.length > 0) {
    const { error: nErr } = await supabase.from('task_nodes').insert(nodesPayload);
    if (nErr) throw nErr;
  }

  return task.id;
}

// ─── 更新任务基本信息 ─────────────────────────────────────
export async function updateTask(
  id: string,
  fields: Partial<Pick<Task, 'title' | 'note' | 'color' | 'progress_position'>>
): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id);
  if (error) throw error;
}

// ─── 更新进度位置 ─────────────────────────────────────────
export async function updateTaskProgress(id: string, progress: number): Promise<void> {
  const clamped = Math.max(0, Math.min(1, progress));
  const { error } = await supabase
    .from('tasks')
    .update({ progress_position: clamped })
    .eq('id', id);
  if (error) throw error;
}

// ─── 删除任务 ─────────────────────────────────────────────
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ─── 更新节点标题 ─────────────────────────────────────────
export async function updateNodeTitle(nodeId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('task_nodes')
    .update({ title: title.trim() })
    .eq('id', nodeId);
  if (error) throw error;
}

// ─── 添加节点 ─────────────────────────────────────────────
export async function addNode(taskId: string, title: string, position: number): Promise<TaskNode> {
  const { data, error } = await supabase
    .from('task_nodes')
    .insert({ task_id: taskId, title: title.trim(), position })
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('添加节点失败');
  return data;
}

// ─── 删除节点 ─────────────────────────────────────────────
export async function deleteNode(nodeId: string): Promise<void> {
  const { error } = await supabase.from('task_nodes').delete().eq('id', nodeId);
  if (error) throw error;
}

// ─── 批量更新节点顺序 ─────────────────────────────────────
export async function reorderNodes(nodes: Pick<TaskNode, 'id' | 'position'>[]): Promise<void> {
  const updates = nodes.map((n) =>
    supabase.from('task_nodes').update({ position: n.position }).eq('id', n.id)
  );
  await Promise.all(updates);
}
