# 将 11.1 调整为第 11 阶段内部探索版本

## 背景与目标

- `11.1` 属于第 11 阶段算法探索，不应与完整课程阶段平级。
- 根据算法特征使用可识别的目录名，避免后续出现多个 11.x 实验时含义不清。

## 约束与原则

- 将原根目录 `11.1` 整体移动到 `11. Automated generations/11.1-pure-distance-selection`。
- `pure-distance-selection` 表示该版本按纯前进距离进行同状态车辆选择。
- 保持算法与独立训练存储不变，只调整组织结构、展示名称和资源相对路径。

## 阶段与 TODO

- [x] 验证源目录和目标父目录。
- [x] 移动探索版本并按特点重命名。
- [x] 修正第 9 阶段公共脚本和车辆图片的相对路径。
- [x] 更新项目认知和索引。
- [x] 验证语法、资源路径和旧目录清理结果。

## 代码变更

- 探索版本目录整体移动。

```diff
-11.1/
+11. Automated generations/11.1-pure-distance-selection/
```

- `11. Automated generations/11.1-pure-distance-selection/index.html`：更新名称和嵌套后的资源路径。

```diff
-    <title>自动驾驶汽车 - 11.1 纯距离训练</title>
+    <title>自动驾驶汽车 - 11.1 纯距离选择</title>
-            <h1>11.1 纯距离训练</h1>
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

- `11. Automated generations/11.1-pure-distance-selection/car.js`：修正车辆图片路径。

```diff
-        this.img.src = "../9. Fine-tuning/car.png";
+        this.img.src = "../../9. Fine-tuning/car.png";
```

- `AGENTS.md`：将 11.1 认知更新为第 11 阶段内部探索版本。

```diff
-- `11.1` 是从第 11 阶段当前版本冻结出的纯距离算法分支，保留“存活优先、同状态比较前进距离”的选择规则，并使用独立的训练存储键，便于后续与其他评分方案对照实验。
+- `11. Automated generations/11.1-pure-distance-selection` 是第 11 阶段内部的探索版本，冻结“存活优先、同状态比较前进距离”的纯距离选择规则，并使用独立训练存储键，便于与后续评分方案进行对照实验。
```

- `.agentdocs/index.md`：新增本记录并修正探索版本路径。

```diff
+- `workflow/20260809193328-relocate-11-1-distance-experiment.md` - 将 11.1 移入第 11 阶段并按纯距离选择特点重命名；维护 11.x 探索版本结构时读取。
-- `11.1` 是当前“存活优先、同状态比较纯前进距离”算法的独立快照，使用 `selfDrivingCarGenerationState11_1DistanceV1` 保存训练状态。
+- `11. Automated generations/11.1-pure-distance-selection` 是第 11 阶段内部的纯距离选择探索版本，使用 `selfDrivingCarGenerationState11_1DistanceV1` 独立保存训练状态。
```

## 测试用例

### TC-001 脚本语法

- 类型：静态检查
- 优先级：高
- 操作步骤：对探索版本的 `main.js` 和 `car.js` 执行 `node --check`。
- 预期结果：无语法错误。
- 是否通过：通过。

### TC-002 页面资源路径

- 类型：资源检查
- 优先级：高
- 操作步骤：解析入口中的全部 `src` 和 `href`，并检查车辆图片路径。
- 预期结果：全部目标文件存在。
- 是否通过：通过。

### TC-003 目录结构

- 类型：结构检查
- 优先级：高
- 操作步骤：检查新旧目录。
- 预期结果：新目录存在，根目录旧 `11.1` 不再存在。
- 是否通过：通过。
