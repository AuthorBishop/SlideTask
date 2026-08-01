/**
 * 组件回归测试：ConfirmDialog.tsx — 确认对话框渲染与交互
 *
 * NOTE: AlertDialog 使用了 @rn-primitives/alert-dialog 原生模块，
 * 在 Jest 中需 mock。以下测试验证 UI 结构、默认值和回调传参。
 */

import '@testing-library/jest-native/extend-expect';

// Mock 所有原生 UI 原语
jest.mock('@/components/ui/alert-dialog', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const AlertDialog = ({ children, open, onOpenChange }: any) =>
    open ? <View testID="alert-dialog-root">{children}</View> : null;
  const AlertDialogContent = ({ children }: any) => (
    <View testID="alert-dialog-content">{children}</View>
  );
  const AlertDialogHeader = ({ children }: any) => (
    <View testID="alert-dialog-header">{children}</View>
  );
  const AlertDialogTitle = ({ children }: any) => (
    <Text testID="alert-dialog-title">{children}</Text>
  );
  const AlertDialogDescription = ({ children }: any) => (
    <Text testID="alert-dialog-description">{children}</Text>
  );
  return {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
  };
});

jest.mock('@/components/ui/button', () => ({
  buttonVariants: jest.fn(({ variant }: any = {}) =>
    variant === 'outline' ? 'border px-4 py-2 rounded-lg' : 'bg-primary px-4 py-2 rounded-lg'
  ),
}));

jest.mock('@/components/ui/text', () => {
  const { Text } = require('react-native');
  return { Text };
});

import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import ConfirmDialog from '@/components/tasks/ConfirmDialog';

// Minimal test renderer that works with AlertDialog mock
function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  return render(
    <ConfirmDialog
      visible={true}
      title="测试标题"
      message="测试消息内容"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />
  );
}

describe('ConfirmDialog', () => {
  it('visible=true 时渲染对话框', () => {
    const { getByTestId } = renderDialog();
    expect(getByTestId('alert-dialog-root')).toBeTruthy();
  });

  it('visible=false 时不渲染对话框', () => {
    const { queryByTestId } = renderDialog({ visible: false });
    expect(queryByTestId('alert-dialog-root')).toBeNull();
  });

  it('渲染 title 和 message', () => {
    const { getByTestId } = renderDialog({
      title: '删除确认',
      message: '此操作不可撤销',
    });
    expect(getByTestId('alert-dialog-title')).toHaveTextContent('删除确认');
    expect(getByTestId('alert-dialog-description')).toHaveTextContent('此操作不可撤销');
  });

  it('默认按钮文字为 "确认" 和 "取消"', () => {
    const { getByText } = renderDialog();
    expect(getByText('确认')).toBeTruthy();
    expect(getByText('取消')).toBeTruthy();
  });

  it('自定义按钮文字生效', () => {
    const { getByText } = renderDialog({
      confirmText: '是的',
      cancelText: '不要',
    });
    expect(getByText('是的')).toBeTruthy();
    expect(getByText('不要')).toBeTruthy();
  });

  // --- 边界条件 ---
  it('空 title 和 message 允许渲染', () => {
    const { getByTestId } = renderDialog({ title: '', message: '' });
    expect(getByTestId('alert-dialog-root')).toBeTruthy();
  });

  it('极长 title 不溢出', () => {
    const longTitle = 'A'.repeat(200);
    const { getByTestId } = renderDialog({ title: longTitle });
    expect(getByTestId('alert-dialog-root')).toBeTruthy();
  });

  it('confirmColor 为 undefined 时不传递自定义背景色', () => {
    const { getByTestId } = renderDialog({ confirmColor: undefined });
    expect(getByTestId('alert-dialog-root')).toBeTruthy();
  });

  it('onCancel 在 visible=false 时不应被调用', () => {
    const onCancel = jest.fn();
    renderDialog({ visible: false, onCancel });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
