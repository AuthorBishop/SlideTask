# TaskFlow

一个简洁的流程管理待办事项应用，基于 React Native + Expo。

## 功能

- **任务管理** — 创建、编辑、删除任务
- **进度跟踪** — 可视化进度条，拖动调整任务进度
- **节点编辑** — 内联编辑任务节点标题
- **浅色主题** — 每个任务卡片根据颜色显示浅色背景

## 技术栈

- React Native / Expo
- Expo Router（文件路由）
- NativeWind v4（Tailwind CSS）
- Reanimated + Gesture Handler（动画与手势）
- IndexedDB（Web 端持久化存储）

## 本地运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
npx expo start --web --port 3001
```

需要 Node.js >= 20.19.4。
