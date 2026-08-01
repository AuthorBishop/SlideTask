/**
 * 集成测试：ctx/confirm.tsx — ConfirmContext 状态流转
 */
import '@testing-library/jest-native/extend-expect';
import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ConfirmProvider, useConfirm } from '@/ctx/confirm';

// Mock ConfirmDialog
jest.mock('@/components/tasks/ConfirmDialog', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return function MockConfirmDialog({ visible, title, message, onConfirm, onCancel }: any) {
    if (!visible) return null;
    return (
      <View testID="confirm-dialog">
        <Text testID="confirm-title">{title}</Text>
        <Text testID="confirm-message">{message}</Text>
        <Pressable testID="confirm-ok-btn" onPress={onConfirm}>
          <Text>确认</Text>
        </Pressable>
        <Pressable testID="confirm-cancel-btn" onPress={onCancel}>
          <Text>取消</Text>
        </Pressable>
      </View>
    );
  };
});

// ── 消费组件 ──
function TestConsumer({ onMount }: { onMount: (showConfirm: any) => void }) {
  const { showConfirm } = useConfirm();
  React.useEffect(() => {
    onMount(showConfirm);
  }, [showConfirm, onMount]);
  return <Text testID="consumer">Consumer</Text>;
}

describe('ConfirmContext', () => {
  it('Provider 内 useConfirm 正常获取上下文', () => {
    const { getByTestId } = render(
      <ConfirmProvider>
        <TestConsumer onMount={() => {}} />
      </ConfirmProvider>
    );
    expect(getByTestId('consumer')).toBeTruthy();
  });

  it('showConfirm 触发对话框显示', async () => {
    let showConfirmFn: any = null;
    const { getByTestId, queryByTestId } = render(
      <ConfirmProvider>
        <TestConsumer onMount={(fn) => { showConfirmFn = fn; }} />
      </ConfirmProvider>
    );

    expect(queryByTestId('confirm-dialog')).toBeNull();

    await act(async () => {
      showConfirmFn({ title: '删除确认', message: '确定删除？' });
    });

    await waitFor(() => {
      expect(getByTestId('confirm-dialog')).toBeTruthy();
    });

    expect(getByTestId('confirm-title')).toHaveTextContent('删除确认');
  });

  it('confirm 按钮返回 true', async () => {
    let showConfirmFn: any = null;
    const { getByTestId } = render(
      <ConfirmProvider>
        <TestConsumer onMount={(fn) => { showConfirmFn = fn; }} />
      </ConfirmProvider>
    );

    let result: boolean | null = null;

    // Step 1: 触发对话框
    await act(async () => {
      showConfirmFn({ title: 'T', message: 'M' });
    });

    // Step 2: 等待渲染并点击确认
    await waitFor(() => {
      expect(getByTestId('confirm-dialog')).toBeTruthy();
    });

    // Step 3: 监听 promise 结果
    const promise = showConfirmFn({ title: 'T2', message: 'M2' });
    await waitFor(() => {
      expect(getByTestId('confirm-dialog')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('confirm-ok-btn'));
      result = await promise;
    });

    expect(result).toBe(true);
  });

  it('cancel 按钮返回 false', async () => {
    let showConfirmFn: any = null;
    const { getByTestId } = render(
      <ConfirmProvider>
        <TestConsumer onMount={(fn) => { showConfirmFn = fn; }} />
      </ConfirmProvider>
    );

    // 先调用一次以初始化 resolver
    await act(async () => {
      showConfirmFn({ title: 'Init', message: 'Init' });
    });

    // 第二次调用以测试 cancel
    const promise = showConfirmFn({ title: 'Cancel Test', message: 'Click cancel' });

    await waitFor(() => {
      expect(getByTestId('confirm-dialog')).toBeTruthy();
    });

    let result: boolean | null = null;
    await act(async () => {
      fireEvent.press(getByTestId('confirm-cancel-btn'));
      result = await promise;
    });

    expect(result).toBe(false);
  });

  it('Provider 外使用 useConfirm 抛出错误', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      try {
        useConfirm();
        return <Text testID="bad">should not render</Text>;
      } catch (e: any) {
        return <Text testID="error-msg">{e.message}</Text>;
      }
    }

    const { getByTestId } = render(<BadConsumer />);
    expect(getByTestId('error-msg')).toHaveTextContent('useConfirm must be used within ConfirmProvider');

    spy.mockRestore();
  });

  it('连续快速两次 showConfirm 不崩溃', async () => {
    let showConfirmFn: any = null;
    render(
      <ConfirmProvider>
        <TestConsumer onMount={(fn) => { showConfirmFn = fn; }} />
      </ConfirmProvider>
    );

    await act(async () => {
      showConfirmFn({ title: 'First', message: 'M1' });
      showConfirmFn({ title: 'Second', message: 'M2' });
    });

    // 不 crash 即通过
  });
});
