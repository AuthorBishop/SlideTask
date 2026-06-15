# SlideTask 项目 — AI 代码操作规范

> 本文档约束 AI 助手在此项目中的所有代码操作行为。每次操作必须严格遵循以下规范。

---

## 一、需求润色（需求 → 结构化描述 → 确认 → 编码）

**规则**：无论用户提出的需求多么简单，AI 必须先将其润色为逻辑严密、结构清晰的需求描述，提交给用户审核确认后，方可进行代码修改。

**禁止**：拿到需求直接写代码。

**流程**：
1. 接收用户需求
2. 分析需求，理清功能边界、交互逻辑、技术约束
3. 输出结构化需求描述（包含：背景、目标、改动范围、预期效果）
4. 等待用户确认（"可以"、"没问题"、"开始" 等明确信号）
5. 用户确认后，开始编码

---

## 二、Git 版本管理（自动提交 + 推送）

**规则**：每次代码修改完成后，必须通过 git 进行版本保存并推送到远程仓库。

**流程**：
1. 代码修改完成且验证无误后
2. `git add` 添加所有相关修改文件
3. `git commit -m "<type>: <中文描述>"` （commit 格式：fix/feat/refactor/style 等前缀 + 中文描述）
4. `git push` 推送到 GitHub

**冲突处理**：
```powershell
# 优先使用 merge 而非 rebase（避免复杂冲突）
git pull --no-rebase origin master

# 解决冲突后
git add .
git commit -m "merge: 合并远程更新"
git push
```

**注意事项**：
- `.skills/` 目录中的 shell 脚本权限变更（100755↔100644）可能导致 git 检测到变更，使用 `git checkout -- .skills/` 恢复
- 不要修改 `.gitignore` 来追踪 `.skills/` 文件
- 推送前确保本地 dev server 已停止，避免文件锁定冲突

---

## 三、调试总结（修改后输出结构化总结）

**规则**：每次代码修改完成并推送后，必须向用户输出一份调试总结。

**总结内容**：
- 本次改了什么（文件、功能点）
- 解决/实现了什么问题
- 验证状态（预览面板确认、手动测试结果等）
- 提交记录（commit hash + message）

---

## 四、本地调试端口规范

**规则**：本地开发服务器固定端口，避免每次打开新端口。

**固定端口配置**：
- **Web 开发服务器**：`http://localhost:3001` — 启动命令 `pnpm start --web`

**操作规范**：
1. 启动 dev server 前，检查端口是否被占用，若被占用则先终止旧进程
2. 每次修改完成后，刷新已有的预览面板，不要打开新的预览标签页
3. 完成调试后，dev server 可保持运行

---

## 五、环境要求与启动流程

### 5.1 环境要求

- **Node.js**: v22+
- **包管理器**: pnpm（必须使用 pnpm，禁止 npm/yarn）
- **框架**: Expo 55 + Expo Router
- **构建工具**: Metro Bundler

### 5.2 首次启动 / 依赖安装后

```powershell
# 1. 安装依赖
pnpm install

# 2. 清理缓存（关键步骤，否则可能白屏）
# 删除 Metro 缓存
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
# 删除 Expo 类型缓存
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

# 3. 启动开发服务器
pnpm start --web
```

### 5.3 日常启动

```powershell
pnpm start --web
```

服务器默认运行在 `http://localhost:3001`。

---

## 六、白屏问题排查清单

当出现白屏时，按以下顺序检查：

### 6.1 检查 Metro 编译错误

```powershell
# 查看 Metro 错误日志
Get-Content _metro-err.log
Get-Content _metro.log
```

常见错误类型：

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Cannot find module '@babel/plugin-transform-react-jsx'` | pnpm 严格依赖解析导致缺失传递依赖 | `pnpm add -D @babel/plugin-transform-react-jsx` |
| `TypeError: The "to" argument must be of type string` | `typedRoutes: true` 与 Node 22 不兼容 | 在 `app.json` 中设置 `"typedRoutes": false` |

### 6.2 关键配置项检查

**app.json**：
- `experiments.typedRoutes` 必须为 `false`（Node 22 兼容性）

**package.json**：
- `devDependencies` 中必须包含 `@babel/plugin-transform-react-jsx`（pnpm 需要显式声明）

**src/app/_layout.tsx**：
- 不要使用远程字体加载（如百度 CDN 的 `Glow Sans SC`），会阻塞渲染
- 字体应使用本地资源或 expo-font 内置字体

### 6.3 缓存清理

如果以上检查都正常但仍白屏，执行完整缓存清理：

```powershell
# 停止所有 node 进程
taskkill /F /IM node.exe 2>$null

# 清理所有缓存
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

# 重新启动
pnpm start --web
```

---

## 七、Babel 编译链说明

本项目使用 `miaoda-expo-devkit/babel-preset` 作为 Babel 预设，其内部依赖链：

```
miaoda-expo-devkit/babel-preset
  → babel-preset-expo
    → @babel/preset-react
      → @babel/plugin-transform-react-jsx  ← 必须显式安装！
```

由于 pnpm 的严格依赖解析策略，传递依赖不会自动提升，因此 `@babel/plugin-transform-react-jsx` 必须在 `devDependencies` 中显式声明。

---

## 八、代码修改流程（完整 SOP）

1. **需求润色**：将用户需求转化为结构化描述，等待用户确认（见第一章）
2. **制定方案**：在修改前给出清晰的改动方案
3. **执行修改**：使用 `replace_in_file` 进行精确修改
4. **验证启动**：确认 `pnpm start --web` 能正常启动且无白屏
5. **Git 提交**：`git add` → `git commit` → `git push`（见第二章）
6. **预览验证**：在 IDE 右侧预览面板刷新 `http://localhost:3001` 确认效果
7. **输出总结**：向用户汇报调试总结（见第三章）

---

## 九、已知问题与限制

- **Node 22 + typedRoutes**：`expo-router` 的 `typedRoutes` 实验功能在 Node 22 下有兼容性问题，必须关闭
- **pnpm 严格模式**：部分 Babel 插件需要显式安装，不能依赖传递提升
- **远程字体**：`expo-font` 加载远程字体（如 CDN）可能阻塞首屏渲染，建议使用本地字体
- **端口**：Web 开发服务器默认端口 3001，如被占用会自动递增

---

## 十、补充规范（可随时追加）

> 如需新增规范，请在此章节追加并注明日期。
> - 2026-06-15：初始版本，合并随背项目通用流程规范 + SlideTask 项目特有配置
