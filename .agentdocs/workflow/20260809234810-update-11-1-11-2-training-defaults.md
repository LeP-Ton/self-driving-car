# 更新 11.1 与 11.2 默认训练参数

## 背景与目标

- 将两个对照实验的默认世代长度从 5000 帧提高到 10000 帧。
- 将测试车默认最小速度从 0 提高到 2，减少停车策略并统一对照条件。
- 页面初始值、运行时默认值和非法配置回退值必须保持一致。

## 约束与原则

- 11.1 与 11.2 使用完全相同的新默认参数。
- 不修改可配置范围：世代长度仍为 500～50000 帧，最小速度仍为 0～3。
- 不清除用户已有 localStorage（浏览器本地存储）训练数据；已有配置继续优先。
- 清空训练或首次打开没有存储状态的版本时使用新默认值。

## 阶段与 TODO

- [x] 检索两个版本中默认值、HTML 初始值和清洗回退值。
- [x] 更新 11.1 的四处参数来源。
- [x] 更新 11.2 的四处参数来源。
- [x] 更新项目认知和文档索引。
- [x] 验证两个版本参数一致、脚本语法和 diff 格式。

## 代码变更

- `11. Automated generations/11.1-survival-first/index.html`：更新面板初始值。

```diff
-                    <input id="generationTicksInput" type="number" min="500" max="50000" step="500" value="5000">
+                    <input id="generationTicksInput" type="number" min="500" max="50000" step="500" value="10000">
-                    <input id="minSpeedInput" type="number" min="0" max="3" step="0.05" value="0">
+                    <input id="minSpeedInput" type="number" min="0" max="3" step="0.05" value="2">
```

- `11. Automated generations/11.1-survival-first/main.js`：更新默认配置和无效值回退。

```diff
-    generationTicks: 5000,
+    generationTicks: 10000,
-    minSpeed: 0
+    minSpeed: 2
-        generationTicks: clampNumber(settings.generationTicks, 500, 50000, 5000, true),
+        generationTicks: clampNumber(settings.generationTicks, 500, 50000, 10000, true),
-        minSpeed: clampNumber(settings.minSpeed, 0, 3, 0, false)
+        minSpeed: clampNumber(settings.minSpeed, 0, 3, 2, false)
```

- `11. Automated generations/11.2-distance-first/index.html`：更新面板初始值。

```diff
-                    <input id="generationTicksInput" type="number" min="500" max="50000" step="500" value="5000">
+                    <input id="generationTicksInput" type="number" min="500" max="50000" step="500" value="10000">
-                    <input id="minSpeedInput" type="number" min="0" max="3" step="0.05" value="0">
+                    <input id="minSpeedInput" type="number" min="0" max="3" step="0.05" value="2">
```

- `11. Automated generations/11.2-distance-first/main.js`：更新默认配置和无效值回退。

```diff
-    generationTicks: 5000,
+    generationTicks: 10000,
-    minSpeed: 0
+    minSpeed: 2
-        generationTicks: clampNumber(settings.generationTicks, 500, 50000, 5000, true),
+        generationTicks: clampNumber(settings.generationTicks, 500, 50000, 10000, true),
-        minSpeed: clampNumber(settings.minSpeed, 0, 3, 0, false)
+        minSpeed: clampNumber(settings.minSpeed, 0, 3, 2, false)
```

- `AGENTS.md`：记录两个实验的新默认值及持久化优先级。

```diff
+- 11.1 与 11.2 的默认世代长度统一为 10000 帧，测试车默认最小速度统一为 2；已有浏览器持久化配置仍优先，清空训练后恢复新默认值。
```

- `.agentdocs/index.md`：新增本记录和关键记忆。

```diff
+- `workflow/20260809234810-update-11-1-11-2-training-defaults.md` - 将 11.1、11.2 默认世代长度改为 10000，默认最小速度改为 2；核对实验默认参数时读取。
+- 11.1 与 11.2 默认每代运行 10000 帧，测试车默认最小速度为 2；localStorage 中已有设置优先，清空训练后才会恢复新默认值。
```

## 测试用例

### TC-001 首次运行默认值

- 类型：配置静态检查
- 优先级：高
- 操作步骤：检查两个版本的 `DEFAULT_TRAINING_SETTINGS`。
- 预期结果：`generationTicks` 为 10000，`minSpeed` 为 2。
- 是否通过：通过。

### TC-002 面板初始值

- 类型：界面静态检查
- 优先级：高
- 操作步骤：检查两个入口的输入框 `value`。
- 预期结果：世代长度为 10000，最小速度为 2。
- 是否通过：通过。

### TC-003 配置回退

- 类型：边界检查
- 优先级：高
- 操作步骤：检查 `sanitizeTrainingSettings` 的回退参数。
- 预期结果：无效或缺失输入回退为 10000 和 2。
- 是否通过：通过。

### TC-004 JavaScript 语法

- 类型：静态检查
- 优先级：高
- 操作步骤：对两个版本的 `main.js` 执行 `node --check`。
- 预期结果：无语法错误。
- 是否通过：通过。

### TC-005 diff 格式

- 类型：版本检查
- 优先级：中
- 操作步骤：执行 `git diff --check`。
- 预期结果：无空白错误。
- 是否通过：通过。
