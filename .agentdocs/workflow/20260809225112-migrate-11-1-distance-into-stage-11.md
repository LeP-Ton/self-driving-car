# 将纯距离 worktree 移植为第 11 阶段内部的 11.1

## 背景与目标

- 多分支 worktree 便于并行开发，但不便于在一个项目中直接发布和体验多个探索版本。
- 将 `E:\project\self-driving-car-11.1-pure-distance-selection\11. Automated generations` 的最新实现完整移入主项目第 11 阶段。
- 补回实验分支已经记录、但主分支尚不存在的 `.agentdocs` 文档。

## 约束与原则

- 目标目录固定为 `11. Automated generations/11.1-pure-distance-selection`。
- 迁移源必须是干净的 `experiment/11.1-pure-distance-selection` worktree。
- 保留源版本最新行为：纯距离选择、测试车最小速度配置、最小速度 0 禁止倒车、无长期跟车淘汰。
- 只调整嵌套目录所需的页面标识、资源相对路径和独立存储键，不改动算法。
- 外部 worktree 暂时保留，避免未经要求删除实验环境。

## 阶段与 TODO

- [x] 读取主项目文档索引并确认主分支工作区干净。
- [x] 核对实验 worktree 分支、状态、代码文件和缺失文档。
- [x] 读取实验索引和最新三份行为变更文档。
- [x] 迁移四个运行文件和七份缺失文档。
- [x] 修正 11.1 页面名称、公共资源路径和独立存储键。
- [x] 更新根项目认知和文档索引。
- [x] 验证脚本语法、资源存在性、关键功能和 diff 格式。

## 当前规则

- 11.1 使用“存活优先、同状态比较纯前进距离”选择车辆。
- 超车数量只作为面板观察指标，不参与亲本选择。
- 不检测或淘汰长期跟车，车辆仅因撞道路边界或交通车而硬淘汰。
- 测试车最小速度可设置为 0～3；0 允许停车但禁止倒车，交通车保留原倒车下限。
- 训练状态使用 `selfDrivingCarGenerationState11_1DistanceV1`，不覆盖第 11 阶段综合积分 V7 数据。

## 代码变更

- 从实验 worktree 复制 11.1 的运行文件。

```diff
copy from E:/project/self-driving-car-11.1-pure-distance-selection/11. Automated generations/index.html
copy to 11. Automated generations/11.1-pure-distance-selection/index.html
copy from E:/project/self-driving-car-11.1-pure-distance-selection/11. Automated generations/style.css
copy to 11. Automated generations/11.1-pure-distance-selection/style.css
copy from E:/project/self-driving-car-11.1-pure-distance-selection/11. Automated generations/car.js
copy to 11. Automated generations/11.1-pure-distance-selection/car.js
copy from E:/project/self-driving-car-11.1-pure-distance-selection/11. Automated generations/main.js
copy to 11. Automated generations/11.1-pure-distance-selection/main.js
```

- `11. Automated generations/11.1-pure-distance-selection/index.html`：标记 11.1 并修正嵌套后的公共脚本路径。

```diff
-    <title>自动驾驶汽车 - 自动世代训练</title>
+    <title>自动驾驶汽车 - 11.1 纯距离选择</title>
-            <h1>自动世代训练</h1>
+            <h1>11.1 纯距离选择</h1>
-    <script src="../9. Fine-tuning/visualizer.js"></script>
-    <script src="../9. Fine-tuning/network.js"></script>
-    <script src="../9. Fine-tuning/sensor.js"></script>
-    <script src="../9. Fine-tuning/utils.js"></script>
-    <script src="../9. Fine-tuning/road.js"></script>
-    <script src="../9. Fine-tuning/controls.js"></script>
+    <script src="../../9. Fine-tuning/visualizer.js"></script>
+    <script src="../../9. Fine-tuning/network.js"></script>
+    <script src="../../9. Fine-tuning/sensor.js"></script>
+    <script src="../../9. Fine-tuning/utils.js"></script>
+    <script src="../../9. Fine-tuning/road.js"></script>
+    <script src="../../9. Fine-tuning/controls.js"></script>
```

- `11. Automated generations/11.1-pure-distance-selection/car.js`：修正嵌套后的车辆图片路径。

```diff
-        this.img.src = "../9. Fine-tuning/car.png";
+        this.img.src = "../../9. Fine-tuning/car.png";
```

- `11. Automated generations/11.1-pure-distance-selection/main.js`：更新阶段说明并隔离存储。

```diff
- * 第 11 阶段：自动世代训练主流程
+ * 第 11.1 阶段：位于第 11 阶段内部的纯距离选择探索版本
-    // V8 使用“存活优先、距离第二”的简化规则，旧版积分不再具有可比性。
-    storageKey: "selfDrivingCarGenerationStateV8"
+    // 11.1 使用独立存储，避免与第 11 阶段综合积分版本相互覆盖训练记录。
+    storageKey: "selfDrivingCarGenerationState11_1DistanceV1"
```

- 补充实验分支中缺失的历史文档。

```diff
+ .agentdocs/workflow/20260809182541-simplify-selection-by-distance.md
+ .agentdocs/workflow/20260809192442-create-11-1-distance-branch.md
+ .agentdocs/workflow/20260809193328-relocate-11-1-distance-experiment.md
+ .agentdocs/workflow/20260809194712-manage-distance-experiment-with-worktree.md
+ .agentdocs/workflow/20260809201329-add-minimum-test-car-speed.md
+ .agentdocs/workflow/20260809203238-fix-zero-minimum-speed-semantics.md
+ .agentdocs/workflow/20260809205627-remove-following-elimination.md
```

- `AGENTS.md`：新增主项目对 11.1 最新行为的认知。

```diff
+- `11. Automated generations/11.1-pure-distance-selection` 是第 11 阶段内部的探索版本：亲本按“存活优先、同状态比较纯前进距离”选择，不检测长期跟车；面板额外支持测试车最小速度 0～3，并使用独立训练存储键。
```

- `.agentdocs/index.md`：增加本次迁移、七份补回文档及 11.1 关键记忆的索引。

```diff
+- `workflow/20260809225112-migrate-11-1-distance-into-stage-11.md` - 将纯距离 worktree 最新实现移植为第 11 阶段内部的 11.1 探索版本，并补齐缺失文档；运行或维护 11.1 时优先读取。
+- `workflow/20260809205627-remove-following-elimination.md` - 删除长期跟车检测、淘汰及面板统计，车辆仅因碰撞硬淘汰；维护 11.1 当前筛选和淘汰规则时读取。
+- `workflow/20260809203238-fix-zero-minimum-speed-semantics.md` - 修正最小速度 0 仍可倒车的问题，并保留交通车原有倒车下限；理解 11.1 速度下限语义时读取。
+- `workflow/20260809201329-add-minimum-test-car-speed.md` - 为测试车增加默认 0、可配置且随下一代生效的最小速度；调整 11.1 训练车速度下限时读取。
+- `workflow/20260809194712-manage-distance-experiment-with-worktree.md` - 记录纯距离算法曾迁移到独立分支和 worktree 的过程；追溯实验分支来源时读取。
+- `workflow/20260809193328-relocate-11-1-distance-experiment.md` - 记录 11.1 曾移入第 11 阶段并按纯距离特点重命名的过程；追溯目录方案时读取。
+- `workflow/20260809192442-create-11-1-distance-branch.md` - 记录最初从第 11 阶段冻结 11.1 纯距离版本的过程；追溯 11.1 起点时读取。
+- `workflow/20260809182541-simplify-selection-by-distance.md` - 将综合积分简化为“存活优先、距离第二”；理解 11.1 纯距离选择规则时读取。
+- `11. Automated generations/11.1-pure-distance-selection/index.html` 是 11.1 纯距离探索入口；它由纯距离 worktree 最新实现迁入，使用 `selfDrivingCarGenerationState11_1DistanceV1` 独立保存训练状态。
+- 11.1 不检测或淘汰长期跟车，只有碰撞会硬淘汰；测试车最小速度可配置为 0～3，设为 0 时允许停车但禁止倒车。
```

## 测试用例

### TC-001 JavaScript 语法

- 类型：静态检查
- 优先级：高
- 操作步骤：对 11.1 的 `main.js` 和 `car.js` 执行 `node --check`。
- 预期结果：均无语法错误。
- 是否通过：通过。

### TC-002 页面资源完整性

- 类型：资源检查
- 优先级：高
- 操作步骤：解析入口内全部 `src` 和 `href`，检查相对路径目标。
- 预期结果：全部样式与脚本存在，车辆图片路径有效。
- 是否通过：通过。

### TC-003 最新行为保留

- 类型：迁移回归检查
- 优先级：高
- 操作步骤：检索距离比较器、最小速度配置和跟车残留引用。
- 预期结果：存在纯距离与最小速度逻辑，不存在跟车检测或淘汰逻辑。
- 是否通过：通过。

### TC-004 迁移一致性

- 类型：完整性检查
- 优先级：中
- 操作步骤：比较源和目标 `style.css` 的 SHA-256。
- 预期结果：完全一致。
- 是否通过：通过。

### TC-005 diff 格式

- 类型：版本检查
- 优先级：中
- 操作步骤：执行 `git diff --check`。
- 预期结果：无空白错误。
- 是否通过：通过。
