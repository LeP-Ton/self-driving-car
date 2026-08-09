# 将 11.1 命名为 survival-first

## 背景与目标

- 原名称 `pure-distance-selection` 容易让人误以为算法只比较距离。
- 当前算法实际先比较是否存活，再在相同状态下比较前进距离，因此使用 `survival-first` 更准确。
- 按用户要求采用简洁名称 `11.1-survival-first`。

## 约束与原则

- 只调整主项目内 11.1 的目录、页面和说明名称，不改变选择算法及训练数据。
- 保留存储键 `selfDrivingCarGenerationState11_1DistanceV1`，避免改名导致已有训练记录丢失。
- 外部 worktree 和实验分支名称不在本次范围内。
- 历史 workflow 文档保留当时路径，作为真实过程记录。

## 阶段与 TODO

- [x] 核对源目录、目标目录和当前引用。
- [x] 重命名 11.1 目录。
- [x] 更新页面标题和源码阶段说明。
- [x] 更新项目认知和文档索引。
- [x] 验证旧目录消失、新入口资源完整及脚本语法。

## 代码变更

- 目录重命名。

```diff
-11. Automated generations/11.1-pure-distance-selection/
+11. Automated generations/11.1-survival-first/
```

- `11. Automated generations/11.1-survival-first/index.html`：更新用户可见名称。

```diff
-    <title>自动驾驶汽车 - 11.1 纯距离选择</title>
+    <title>自动驾驶汽车 - 11.1 生存优先</title>
-            <h1>11.1 纯距离选择</h1>
+            <h1>11.1 生存优先</h1>
```

- `11. Automated generations/11.1-survival-first/main.js`：更新阶段说明。

```diff
- * 第 11.1 阶段：位于第 11 阶段内部的纯距离选择探索版本
+ * 第 11.1 阶段：位于第 11 阶段内部的生存优先探索版本
```

- `AGENTS.md`：更新当前探索版本路径和名称。

```diff
-- `11. Automated generations/11.1-pure-distance-selection` 是第 11 阶段内部的探索版本：亲本按“存活优先、同状态比较纯前进距离”选择，不检测长期跟车；面板额外支持测试车最小速度 0～3，并使用独立训练存储键。
+- `11. Automated generations/11.1-survival-first` 是第 11 阶段内部的生存优先探索版本：亲本按“存活优先、同状态比较纯前进距离”选择，不检测长期跟车；面板额外支持测试车最小速度 0～3，并使用独立训练存储键。
```

- `.agentdocs/index.md`：新增改名记录并更新当前入口。

```diff
+- `workflow/20260809225946-rename-11-1-survival-first.md` - 将 11.1 从纯距离命名调整为更简洁准确的 survival-first；查找当前 11.1 入口时读取。
-- `11. Automated generations/11.1-pure-distance-selection/index.html` 是 11.1 纯距离探索入口；它由纯距离 worktree 最新实现迁入，使用 `selfDrivingCarGenerationState11_1DistanceV1` 独立保存训练状态。
+- `11. Automated generations/11.1-survival-first/index.html` 是 11.1 生存优先探索入口；其规则是存活车辆绝对优先、同状态比较前进距离，使用 `selfDrivingCarGenerationState11_1DistanceV1` 独立保存训练状态。
```

## 测试用例

### TC-001 目录结构

- 类型：结构检查
- 优先级：高
- 操作步骤：检查新旧目录。
- 预期结果：`11.1-survival-first` 存在，旧目录不存在。
- 是否通过：通过。

### TC-002 JavaScript 语法

- 类型：静态检查
- 优先级：高
- 操作步骤：执行 `node --check` 检查 11.1 的 `main.js` 和 `car.js`。
- 预期结果：无语法错误。
- 是否通过：通过。

### TC-003 页面资源

- 类型：资源检查
- 优先级：高
- 操作步骤：解析新入口全部 `src` 与 `href` 相对路径。
- 预期结果：全部资源存在。
- 是否通过：通过。

### TC-004 训练数据兼容

- 类型：配置检查
- 优先级：中
- 操作步骤：检查 11.1 存储键。
- 预期结果：仍为 `selfDrivingCarGenerationState11_1DistanceV1`。
- 是否通过：通过。
