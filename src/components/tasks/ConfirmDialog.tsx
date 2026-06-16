import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
  Platform,
} from 'react-native';

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
  confirmColor = '#111827',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            width: '100%',
            maxWidth: 340,
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
              },
              default: {
                elevation: 12,
              },
            }),
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation?.()}>
            {/* 内容区 */}
            <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 8 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: 'System',
                  fontWeight: '600',
                  color: '#111827',
                  textAlign: 'center',
                  marginBottom: 10,
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'System',
                  color: '#6B7280',
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {message}
              </Text>
            </View>

            {/* 分割线 + 按钮区 */}
            <View
              style={{
                marginTop: 16,
                borderTopWidth: 1,
                borderTopColor: '#F3F4F6',
                flexDirection: 'row',
              }}
            >
              {/* 取消按钮 */}
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRightWidth: 1,
                  borderRightColor: '#F3F4F6',
                  backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
                })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'System',
                    fontWeight: '500',
                    color: '#6B7280',
                  }}
                >
                  {cancelText}
                </Text>
              </Pressable>

              {/* 确认按钮 */}
              <Pressable
                onPress={onConfirm}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? `${confirmColor}E6` : confirmColor,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'System',
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}
                >
                  {confirmText}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
