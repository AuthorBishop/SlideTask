/**
 * 集成测试：ctx/fontSize.tsx — FontSizeContext 档位切换逻辑
 */
import '@testing-library/jest-native/extend-expect';
import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  FontSizeProvider,
  useFontSize,
  FONT_SIZE_LEVELS,
  FONT_SIZE_LABELS,
} from '@/ctx/fontSize';

function FontSizeConsumer({ spy }: { spy: { current: any } }) {
  const ctx = useFontSize();
  React.useEffect(() => {
    spy.current = ctx;
  }, [ctx]);
  return (
    <>
      <Text testID="level">{ctx.level}</Text>
      <Text testID="fontSize">{ctx.fontSize}</Text>
      <Text testID="label">{ctx.label}</Text>
      <Pressable testID="next-btn" onPress={ctx.nextLevel}>
        <Text>Next</Text>
      </Pressable>
      <Pressable testID="set-btn" onPress={() => ctx.setLevel(4)}>
        <Text>Set Max</Text>
      </Pressable>
    </>
  );
}

describe('FontSizeContext', () => {
  it('默认 level=2（标准）', () => {
    const { getByTestId } = render(
      <FontSizeProvider>
        <FontSizeConsumer spy={{}} />
      </FontSizeProvider>
    );
    expect(getByTestId('level')).toHaveTextContent('2');
    expect(getByTestId('fontSize')).toHaveTextContent('13');
    expect(getByTestId('label')).toHaveTextContent('标准');
  });

  it('nextLevel 循环切换至下一档', async () => {
    const { getByTestId } = render(
      <FontSizeProvider>
        <FontSizeConsumer spy={{}} />
      </FontSizeProvider>
    );

    // level 2 → 3
    await act(async () => {
      fireEvent.press(getByTestId('next-btn'));
    });
    expect(getByTestId('level')).toHaveTextContent('3');
    expect(getByTestId('fontSize')).toHaveTextContent('15');
    expect(getByTestId('label')).toHaveTextContent('较大');

    // level 3 → 4
    await act(async () => {
      fireEvent.press(getByTestId('next-btn'));
    });
    expect(getByTestId('level')).toHaveTextContent('4');
    expect(getByTestId('fontSize')).toHaveTextContent('17');
    expect(getByTestId('label')).toHaveTextContent('大');

    // level 4 → 0 (回绕)
    await act(async () => {
      fireEvent.press(getByTestId('next-btn'));
    });
    expect(getByTestId('level')).toHaveTextContent('0');
    expect(getByTestId('fontSize')).toHaveTextContent('11');
    expect(getByTestId('label')).toHaveTextContent('小');
  });

  it('setLevel 直接设置档位（含 clamp）', async () => {
    const { getByTestId } = render(
      <FontSizeProvider>
        <FontSizeConsumer spy={{}} />
      </FontSizeProvider>
    );

    // setLevel(4) 应设为最大值
    await act(async () => {
      fireEvent.press(getByTestId('set-btn'));
    });
    expect(getByTestId('level')).toHaveTextContent('4');
    expect(getByTestId('fontSize')).toHaveTextContent('17');
    expect(getByTestId('label')).toHaveTextContent('大');
  });

  // --- 边界条件 ---
  it('setLevel 超过最大值 clamp 至 4', async () => {
    const spy = { current: null as any };
    render(
      <FontSizeProvider>
        <FontSizeConsumer spy={spy} />
      </FontSizeProvider>
    );

    await act(async () => {
      spy.current.setLevel(10);
    });

    // 需要重新读取，因为渲染更新
    expect(spy.current.level).toBe(4);
    expect(spy.current.fontSize).toBe(17);
  });

  it('setLevel 负数 clamp 至 0', async () => {
    const spy = { current: null as any };
    render(
      <FontSizeProvider>
        <FontSizeConsumer spy={spy} />
      </FontSizeProvider>
    );

    await act(async () => {
      spy.current.setLevel(-5);
    });

    expect(spy.current.level).toBe(0);
    expect(spy.current.fontSize).toBe(11);
  });

  it('连续 5 次 nextLevel 应回到原点', async () => {
    const { getByTestId } = render(
      <FontSizeProvider>
        <FontSizeConsumer spy={{}} />
      </FontSizeProvider>
    );

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.press(getByTestId('next-btn'));
      });
    }

    // 循环 5 次(2→3→4→0→1→2)应回到 level 2
    expect(getByTestId('level')).toHaveTextContent('2');
  });

  it('FONT_SIZE_LEVELS 和 FONT_SIZE_LABELS 长度一致', () => {
    expect(FONT_SIZE_LEVELS.length).toBe(5);
    expect(FONT_SIZE_LABELS.length).toBe(5);
  });
});
