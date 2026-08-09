# 创建 11.1 纯距离训练分支

## 背景与目标

- 将第 11 阶段当前的纯前进距离算法冻结为独立的 `11.1` 项目，便于后续与其他评分算法做对照实验。
- 保留当前自动世代、无限交通、跟车淘汰、遗传选择和训练面板的完整行为。
- 隔离浏览器训练记录，避免两个阶段相互覆盖历史最佳大脑。

## 约束与原则

- `11.1` 以当前工作区中的第 11 阶段为复制基线，不改变纯距离算法本身。
- `style.css` 和 `car.js` 原样复制；`index.html` 仅修改分支标识；`main.js` 仅修改阶段注释和存储键。
- 继续复用第 9 阶段的几何、传感器、神经网络等公共脚本。

## 阶段与 TODO

- [x] 创建 `11.1` 独立目录和入口。
- [x] 复制当前纯距离算法实现。
- [x] 修改页面标题和说明。
- [x] 设置独立 localStorage（浏览器本地存储）键。
- [x] 更新项目认知与文档索引。
- [x] 验证 JavaScript 语法、复制一致性和页面资源路径。

## 当前进展

- 可直接打开 `11.1/index.html` 运行纯距离训练分支。
- 原第 11 阶段与 11.1 的训练代数、历史距离和大脑互不影响。

## 代码变更

- `11.1/style.css`：从 `11. Automated generations/style.css` 原样复制，SHA-256 一致。

```diff
similarity index 100%
copy from 11. Automated generations/style.css
copy to 11.1/style.css
```

- `11.1/car.js`：从 `11. Automated generations/car.js` 原样复制，SHA-256 一致。

```diff
similarity index 100%
copy from 11. Automated generations/car.js
copy to 11.1/car.js
```

- `11.1/index.html`：完整复制第 11 阶段入口，并增加 11.1 分支标识。

```diff
copy from 11. Automated generations/index.html
copy to 11.1/index.html
-    <title>自动驾驶汽车 - 自动世代训练</title>
+    <title>自动驾驶汽车 - 11.1 纯距离训练</title>
-            <h1>自动世代训练</h1>
+            <h1>11.1 纯距离训练</h1>
-            <p class="hint">每代会自动评估、选择、交叉和变异，无需刷新页面或手动保存。</p>
+            <p class="hint">本分支按“存活优先、同状态比较纯前进距离”自动选择、交叉和变异。</p>
```

- `11.1/main.js`：完整复制当前纯距离训练实现，并隔离训练存储。

```diff
copy from 11. Automated generations/main.js
copy to 11.1/main.js
- * 第 11 阶段：自动世代训练主流程
+ * 第 11.1 阶段：纯距离算法的自动世代训练分支
-    // V8 使用“存活优先、距离第二”的简化规则，旧版积分不再具有可比性。
-    storageKey: "selfDrivingCarGenerationStateV8"
+    // 11.1 使用独立存储，避免与第 11 阶段后续实验相互覆盖训练记录。
+    storageKey: "selfDrivingCarGenerationState11_1DistanceV1"
```

- `AGENTS.md`：记录 11.1 分支用途。

```diff
+- `11.1` 是从第 11 阶段当前版本冻结出的纯距离算法分支，保留“存活优先、同状态比较前进距离”的选择规则，并使用独立的训练存储键，便于后续与其他评分方案对照实验。
```

- `.agentdocs/index.md`：新增本次变更文档和 11.1 关键记忆。

```diff
+- `workflow/20260809192442-create-11-1-distance-branch.md` - 从第 11 阶段冻结出 11.1 纯距离训练分支，并隔离训练存储；进行评分方案对照或维护 11.1 时读取。
+- `11.1` 是当前“存活优先、同状态比较纯前进距离”算法的独立快照，使用 `selfDrivingCarGenerationState11_1DistanceV1` 保存训练状态。
```

## 测试用例

### TC-001 JavaScript 语法

- 类型：静态检查
- 优先级：高
- 操作步骤：执行 `node --check 11.1/main.js` 和 `node --check 11.1/car.js`。
- 预期结果：均无语法错误。
- 是否通过：通过。

### TC-002 核心复制一致性

- 类型：完整性测试
- 优先级：高
- 操作步骤：比较两个阶段的 `style.css` 和 `car.js` SHA-256。
- 预期结果：对应文件完全一致。
- 是否通过：通过。

### TC-003 页面依赖路径

- 类型：资源检查
- 优先级：高
- 操作步骤：解析 `11.1/index.html` 中全部 `src` 与 `href` 相对路径。
- 预期结果：所有本地资源均存在。
- 是否通过：通过。

### TC-004 存储隔离

- 类型：配置检查
- 优先级：高
- 操作步骤：检查 11.1 的 `storageKey`。
- 预期结果：使用 `selfDrivingCarGenerationState11_1DistanceV1`，不同于第 11 阶段 V8。
- 是否通过：通过。
