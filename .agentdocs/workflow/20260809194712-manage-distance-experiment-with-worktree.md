# 使用 Git worktree 管理纯距离算法实验

## 背景与目标

- 目录复制会让公共训练代码产生重复来源，后续修复容易漂移。
- 将纯距离算法作为独立 Git 实验分支，并通过 worktree（独立工作树）提供可直接运行和继续开发的目录。
- 主分支继续保留改版前的积分算法，形成真实的版本级对照。

## 约束与原则

- 实验分支命名为 `experiment/11.1-pure-distance-selection`。
- worktree 目录命名为 `self-driving-car-11.1-pure-distance-selection`，与主工作区互为同级目录。
- 当前尚未审核的纯距离修改先作为实验分支检查点提交，不进入 `main`。
- 删除主项目内部的重复探索目录；实验实现直接使用分支中的 `11. Automated generations`。

## 阶段与 TODO

- [x] 核对当前分支、暂存区、未提交修改和最近提交。
- [x] 确认未提交内容属于纯距离算法及其文档。
- [x] 删除重复的嵌套探索目录。
- [x] 更新项目认知和文档索引。
- [x] 创建并提交纯距离实验分支。
- [x] 将主工作区切回 `main`。
- [x] 创建纯距离实验 worktree。
- [x] 验证分支隔离、worktree 状态和脚本语法。

## 代码变更

- 删除重复目录，纯距离实现改由实验分支承载。

```diff
-11. Automated generations/11.1-pure-distance-selection/
```

- `AGENTS.md`：将目录探索版认知改为 Git 分支与 worktree 认知。

```diff
-- `11. Automated generations/11.1-pure-distance-selection` 是第 11 阶段内部的探索版本，冻结“存活优先、同状态比较前进距离”的纯距离选择规则，并使用独立训练存储键，便于与后续评分方案进行对照实验。
+- 纯距离算法探索由 Git 分支 `experiment/11.1-pure-distance-selection` 管理，并在同级 worktree `self-driving-car-11.1-pure-distance-selection` 中运行；主分支不保留重复的 11.1 目录副本。
```

- `.agentdocs/index.md`：新增本记录并更新关键记忆。

```diff
+- `workflow/20260809194712-manage-distance-experiment-with-worktree.md` - 将纯距离算法迁移到独立实验分支和 worktree，移除目录副本；维护多方案实验工作流时读取。
-- `11. Automated generations/11.1-pure-distance-selection` 是第 11 阶段内部的纯距离选择探索版本，使用 `selfDrivingCarGenerationState11_1DistanceV1` 独立保存训练状态。
+- 纯距离算法位于 `experiment/11.1-pure-distance-selection` 分支，对应同级 worktree `self-driving-car-11.1-pure-distance-selection`；运行其中的 `11. Automated generations/index.html`。
```

## Git 操作记录

```diff
+branch: experiment/11.1-pure-distance-selection
+worktree: ../self-driving-car-11.1-pure-distance-selection
+experiment entry: 11. Automated generations/index.html
```

## 测试用例

### TC-001 分支隔离

- 类型：版本管理检查
- 优先级：高
- 操作步骤：分别检查主工作区和实验 worktree 的当前分支。
- 预期结果：主工作区为 `main`，实验 worktree 为 `experiment/11.1-pure-distance-selection`。
- 是否通过：通过。

### TC-002 算法隔离

- 类型：内容检查
- 优先级：高
- 操作步骤：检索两个工作区的存储键和距离比较器。
- 预期结果：纯距离 V8 规则只存在于实验 worktree 当前版本，主工作区仍为提交 `5ee389d` 的积分规则。
- 是否通过：通过。

### TC-003 JavaScript 语法

- 类型：静态检查
- 优先级：高
- 操作步骤：在实验 worktree 执行 `node --check`。
- 预期结果：`main.js` 和 `car.js` 均无语法错误。
- 是否通过：通过。
