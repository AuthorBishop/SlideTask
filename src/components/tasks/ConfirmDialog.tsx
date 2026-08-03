import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Pressable, View } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmColor,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={visible}
      onOpenChange={(open) => {
        // 仅处理外部关闭（遮罩点击、返回键），按钮按自己的 onPress 处理
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* 不依赖 AlertDialogFooter 的 flex-col-reverse，直接用 flex-row 并排 */}
        <View className="flex-row gap-2 mt-2">
          {/* 取消按钮：outline 变体 */}
          <Pressable
            onPress={onCancel}
            className={buttonVariants({ variant: 'outline' }) + ' flex-1'}
          >
            <Text className="text-sm font-medium">{cancelText}</Text>
          </Pressable>

          {/* 确认按钮：default 变体 + 可选自定义背景色 */}
          <Pressable
            onPress={onConfirm}
            className={buttonVariants() + ' flex-1'}
            style={confirmColor ? { backgroundColor: confirmColor } : undefined}
          >
            <Text className="text-primary-foreground text-sm font-medium">
              {confirmText}
            </Text>
          </Pressable>
        </View>
      </AlertDialogContent>
    </AlertDialog>
  );
}
