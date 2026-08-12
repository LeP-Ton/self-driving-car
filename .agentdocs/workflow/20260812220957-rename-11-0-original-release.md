# 将 11.0 命名为 11.0-original-release

## 背景与目标

- `11.1-survival-first`、`11.2-distance-first` 和 `11.3-comfort-first` 都通过英文后缀表达实验策略，只有 `11.0` 缺少语义名称。
- 将其重命名为 `11.0-original-release`，明确它是第 11 阶段最初的综合积分版本，而不是无名目录。

## 约束与原则

- 只修改目录名称、页面显示和源码版本说明，不改变训练逻辑、资源相对路径或浏览器存储键。
- 保留上一份迁移文档中 `11.0` 的历史过程记录，本次另建文档描述后续重命名。

## 阶段与 TODO

- [x] 重命名目录为 `11.0-original-release`。
- [x] 页面标题改为“11.0 原始版本”。
- [x] 更新源码版本说明。
- [x] 更新项目认知和根索引。
- [x] 完成目录、资源、语法和差异格式检查。

## 代码变更

- 重命名原始版本目录。

```diff
rename from 11. Automated generations/11.0
rename to 11. Automated generations/11.0-original-release
```

- `11. Automated generations/11.0-original-release/index.html`：更新页面显示名称。

```diff
-    <title>自动驾驶汽车 - 11.0 综合积分</title>
+    <title>自动驾驶汽车 - 11.0 原始版本</title>
@@
-            <h1>11.0 综合积分</h1>
+            <h1>11.0 原始版本</h1>
```

- `11. Automated generations/11.0-original-release/main.js`：更新源码版本说明。

```diff
- * 第 11.0 阶段：自动世代训练主流程
+ * 第 11.0 阶段原始版本：自动世代训练主流程
```

- `AGENTS.md`：更新原始版本路径和语义名称。

```diff
-- `11. Automated generations/11.0` 是在第 9 阶段基础上新增的综合积分自动世代训练版本，具备自动评估、精英保留、亲本选择、交叉、变异、持久化和训练控制面板；第 11 阶段根目录只组织 11.0～11.3 子版本及 `shared` 公共层。
+- `11. Automated generations/11.0-original-release` 是在第 9 阶段基础上新增的原始综合积分自动世代训练版本，具备自动评估、精英保留、亲本选择、交叉、变异、持久化和训练控制面板；第 11 阶段根目录只组织带语义后缀的 11.0～11.3 子版本及 `shared` 公共层。
@@
-- `11. Automated generations/11.0/main.js` 已按固定配置、世代初始化、单帧模拟、交通与跟车、适应度与遗传、动画绘制、面板持久化分区，并用中文注释说明完整规则。
+- `11. Automated generations/11.0-original-release/main.js` 已按固定配置、世代初始化、单帧模拟、交通与跟车、适应度与遗传、动画绘制、面板持久化分区，并用中文注释说明完整规则。
```

- `.agentdocs/index.md`：登记本次重命名并更新当前入口。

```diff
 ## 当前变更文档
 
+- `workflow/20260812220957-rename-11-0-original-release.md` - 将缺少语义后缀的 11.0 重命名为 11.0-original-release，并同步入口展示和当前项目认知；查找原始综合积分版本时读取。
@@
-- `11. Automated generations/11.0/index.html` 是综合积分自动训练入口；第 11 阶段根目录统一组织 11.0、11.1、11.2、11.3 和 `shared`，不再直接放置运行文件。
+- `11. Automated generations/11.0-original-release/index.html` 是原始综合积分自动训练入口；第 11 阶段各版本目录均使用“版本号-语义名称”，根目录不再直接放置运行文件。
```

## 测试用例

### TC-001 目录命名

- 类型：结构测试
- 优先级：高
- 操作步骤：列出第 11 阶段根目录。
- 预期结果：存在 `11.0-original-release`，不存在无后缀的 `11.0`。
- 是否通过：通过。

### TC-002 资源与语法

- 类型：静态测试
- 优先级：高
- 操作步骤：检查新目录四个运行文件和第 9 阶段资源目标，并对 `main.js`、`car.js` 执行 `node --check`。
- 预期结果：文件及资源存在，JavaScript 无语法错误。
- 是否通过：通过。

### TC-003 差异格式

- 类型：静态测试
- 优先级：高
- 操作步骤：运行 `git diff --check`。
- 预期结果：无差异格式错误。
- 是否通过：通过。
