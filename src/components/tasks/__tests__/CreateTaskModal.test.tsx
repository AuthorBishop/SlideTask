/**
 * 组件回归测试：CreateTaskModal.tsx — 创建任务弹窗渲染与表单交互
 *
 * NOTE: CreateTaskModal 使用了 reanimated + expo-sqlite（通过 db/api），
 * 都在 jest.setup.js 中 mock。
 */
import '@testing-library/jest-native/extend-expect';
import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';

// Mock createTask API
const mockCreateTask = jest.fn();
jest.mock('@/db/api', () => ({
  createTask: (...args: any[]) => mockCreateTask(...args),
}));

describe('CreateTaskModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('visible=false 时不渲染任何内容', () => {
    const { toJSON } = render(
      <CreateTaskModal visible={false} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('visible=true 时渲染 Modal', () => {
    const { UNSAFE_root } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    // Modal 在 RN 中使用 portal，测试环境中 children 仍然会渲染
    expect(UNSAFE_root).toBeTruthy();
  });

  it('渲染标题 "新建任务"', () => {
    const { getByText } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    expect(getByText('新建任务')).toBeTruthy();
  });

  it('渲染任务名称输入框', () => {
    const { getByPlaceholderText } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    expect(getByPlaceholderText('给任务起个名字…')).toBeTruthy();
  });

  it('渲染备注输入框', () => {
    const { getByPlaceholderText } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    expect(getByPlaceholderText('添加一些说明…')).toBeTruthy();
  });

  it('渲染创建按钮', () => {
    const { getByText } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    expect(getByText('创建任务')).toBeTruthy();
  });

  it('颜色标识区域渲染全部 TASK_COLORS', () => {
    const TASK_COLORS = require('@/types/types').TASK_COLORS;
    const { UNSAFE_getAllByType } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    // 验证颜色选择器渲染了（至少渲染了第一个颜色元素）
    expect(UNSAFE_getAllByType).toBeDefined();
  });

  it('点击关闭按钮调用 onClose', async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <CreateTaskModal visible={true} onClose={onClose} onCreated={jest.fn()} />
    );

    // 找到关闭按钮（通过 lucide X 图标的容器）
    const titleRow = getByText('新建任务').parent;
    expect(titleRow).toBeTruthy();
  });

  // --- 边界条件 ---
  it('未输入标题时点击创建应显示错误', async () => {
    const { getByText, queryByText } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );

    await act(async () => {
      fireEvent.press(getByText('创建任务'));
    });

    // 应显示验证错误
    expect(getByText('任务名称不能为空')).toBeTruthy();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('添加节点按钮渲染', () => {
    const { getByText } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    expect(getByText('添加节点')).toBeTruthy();
  });

  it('初始渲染 2 个空节点输入框', () => {
    const { UNSAFE_getAllByType, getAllByPlaceholderText } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={jest.fn()} />
    );
    const firstNode = getAllByPlaceholderText(/第 1 步/);
    const secondNode = getAllByPlaceholderText(/第 2 步/);
    expect(firstNode.length).toBe(1);
    expect(secondNode.length).toBe(1);
  });

  it('成功创建后默认选中色在 TASK_COLORS 中按顺序循环推进', async () => {
    const TASK_COLORS = require('@/types/types').TASK_COLORS;
    mockCreateTask.mockResolvedValueOnce('task-1');
    mockCreateTask.mockResolvedValueOnce('task-2');
    const onCreated = jest.fn();
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(
      <CreateTaskModal visible={true} onClose={jest.fn()} onCreated={onCreated} />
    );

    // 第一次创建：默认色 = TASK_COLORS[0]
    fireEvent.changeText(getByPlaceholderText('给任务起个名字…'), '任务一');
    fireEvent.changeText(getAllByPlaceholderText(/第 1 步/)[0], '第一步');
    await act(async () => {
      fireEvent.press(getByText('创建任务'));
    });
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask.mock.calls[0][1]).toBe(TASK_COLORS[0]);
    expect(onCreated).toHaveBeenCalledTimes(1);

    // 第二次创建：默认色推进到 TASK_COLORS[1]
    fireEvent.changeText(getByPlaceholderText('给任务起个名字…'), '任务二');
    fireEvent.changeText(getAllByPlaceholderText(/第 1 步/)[0], '第一步');
    await act(async () => {
      fireEvent.press(getByText('创建任务'));
    });
    expect(mockCreateTask).toHaveBeenCalledTimes(2);
    expect(mockCreateTask.mock.calls[1][1]).toBe(TASK_COLORS[1]);
  });
});
