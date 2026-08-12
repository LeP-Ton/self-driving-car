# 将第 11 阶段综合积分版本整理为 11.0

## 背景与目标

- 第 11 阶段根目录原本同时承担综合积分版本入口和多个探索子版本的容器职责，目录层级不一致。
- 将原根目录综合积分版本命名为 11.0，与 11.1 生存优先、11.2 距离优先和 11.3 舒适优先并列。
- 第 11 阶段根目录只保留版本目录和 `shared` 公共层。

## 约束与原则

- 仅调整文件组织、版本展示文字和相对资源路径，不改变 11.0 训练算法及浏览器存储键。
- 历史工作流文档保留当时记录的旧路径，不回写历史。
- 11.1～11.3 和共享交通管理器位置保持不变。

## 阶段与 TODO

- [x] 创建 `11.0` 目录。
- [x] 迁移 `index.html`、`style.css`、`car.js` 和 `main.js`。
- [x] 将第 9 阶段脚本和车辆图片路径增加一级 `../`。
- [x] 将页面及源码版本说明更新为 11.0。
- [x] 更新项目认知和根索引。
- [x] 完成 JavaScript 语法、资源路径、目录结构和差异格式检查。

## 关键风险

- 旧书签 `11. Automated generations/index.html` 不再是有效入口，新入口为 `11. Automated generations/11.0/index.html`。
- 迁移后若资源路径少一级，会导致基础类或车辆图片加载失败，因此需要逐项检查引用目标。

## 代码变更

- 将综合积分版本的四个运行文件迁入 `11.0`。

```diff
rename from 11. Automated generations/index.html
rename to 11. Automated generations/11.0/index.html
rename from 11. Automated generations/style.css
rename to 11. Automated generations/11.0/style.css
rename from 11. Automated generations/car.js
rename to 11. Automated generations/11.0/car.js
rename from 11. Automated generations/main.js
rename to 11. Automated generations/11.0/main.js
```

- `11. Automated generations/11.0/index.html`：修正资源层级并标识 11.0 综合积分。

```diff
-    <title>自动驾驶汽车 - 自动世代训练</title>
+    <title>自动驾驶汽车 - 11.0 综合积分</title>
@@
-            <h1>自动世代训练</h1>
+            <h1>11.0 综合积分</h1>
@@
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

- `11. Automated generations/11.0/car.js`：修正车辆图片相对路径。

```diff
-        this.img.src = "../9. Fine-tuning/car.png";
+        this.img.src = "../../9. Fine-tuning/car.png";
```

- `11. Automated generations/11.0/main.js`：更新版本说明。

```diff
- * 第 11 阶段：自动世代训练主流程
+ * 第 11.0 阶段：自动世代训练主流程
```

- `AGENTS.md`：更新第 11 阶段目录认知和主流程路径。

```diff
-- `11. Automated generations` 是在第 9 阶段基础上新增的自动世代训练版本，具备自动评估、精英保留、亲本选择、交叉、变异、持久化和训练控制面板。
+- `11. Automated generations/11.0` 是在第 9 阶段基础上新增的综合积分自动世代训练版本，具备自动评估、精英保留、亲本选择、交叉、变异、持久化和训练控制面板；第 11 阶段根目录只组织 11.0～11.3 子版本及 `shared` 公共层。
@@
-- `11. Automated generations/main.js` 已按固定配置、世代初始化、单帧模拟、交通与跟车、适应度与遗传、动画绘制、面板持久化分区，并用中文注释说明完整规则。
+- `11. Automated generations/11.0/main.js` 已按固定配置、世代初始化、单帧模拟、交通与跟车、适应度与遗传、动画绘制、面板持久化分区，并用中文注释说明完整规则。
```

- `.agentdocs/index.md`：登记 11.0 目录迁移并更新当前入口。

```diff
 ## 当前变更文档
 
+- `workflow/20260812220411-organize-stage-11-0-directory.md` - 将第 11 阶段根目录的综合积分主版本迁入 11.0，修正第 9 阶段资源相对路径并统一 11.0～11.3 目录结构；启动或维护综合积分版本时读取。
@@
-- 推荐从 `11. Automated generations/index.html` 体验自动化训练；原课程内容仍以第 9、10 阶段作为对应实验版本。
+- `11. Automated generations/11.0/index.html` 是综合积分自动训练入口；第 11 阶段根目录统一组织 11.0、11.1、11.2、11.3 和 `shared`，不再直接放置运行文件。
```

## 测试用例

### TC-001 目录结构

- 类型：结构测试
- 优先级：高
- 操作步骤：列出 `11. Automated generations` 根目录。
- 预期结果：只包含 11.0～11.3 和 `shared` 目录，不包含根级运行文件。
- 是否通过：通过。

### TC-002 JavaScript 语法

- 类型：静态测试
- 优先级：高
- 操作步骤：对 `11.0/main.js` 和 `11.0/car.js` 执行 `node --check`。
- 预期结果：无语法错误。
- 是否通过：通过。

### TC-003 资源引用

- 类型：资源测试
- 优先级：高
- 操作步骤：按 `11.0/index.html` 和 `car.js` 的相对路径解析脚本、样式与车辆图片。
- 预期结果：全部目标文件存在。
- 是否通过：通过。

### TC-004 差异格式

- 类型：静态测试
- 优先级：高
- 操作步骤：运行 `git diff --check`。
- 预期结果：无差异格式错误。
- 是否通过：通过。
