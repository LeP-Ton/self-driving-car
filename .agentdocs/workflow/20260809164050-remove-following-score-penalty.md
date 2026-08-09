# 删除持续跟车逐帧扣分

## 背景与目标

- 第 11 阶段已经具备连续跟车 300 帧硬淘汰机制。
- 原有跟车逐帧扣分与最终淘汰惩罚重复，可能过度压制合理的短期观察和等待变道时机。

## 约束与原则

- 保留跟车识别、滞回、延迟释放和 300 帧淘汰。
- 保留跟车淘汰的一次性 5000 分惩罚。
- 保留每次超车 1000 分、碰撞和闲置惩罚。
- 不升级存储版本，允许 V6 大脑继续训练；新评分通常高于旧评分，历史门槛可自然被超过。

## 阶段与 TODO

- [x] 删除 180 帧跟车扣分宽限配置。
- [x] 删除累计和超期跟车分数惩罚。
- [x] 保留跟车统计字段供检测和面板展示。
- [x] 更新项目认知和文档索引。
- [x] 验证第 1～299 帧不扣分、第 300 帧淘汰扣分。

## 关键风险

- 299 帧内完成超车和立即超车在跟车维度上得分相同，但更早超车通常仍会获得更多前进距离和后续超车机会。
- 若 300 帧阈值过宽或过严，应调整淘汰阈值，而不是重新叠加逐帧惩罚。

## 当前进展

- 跟车过程不再改变适应度。
- 达到 300 帧后仍会立即停止车辆并额外扣 5000 分。

## 代码变更

- `11. Automated generations/main.js` +2 -12

```diff
     followingEnterDistance: 170,
     followingExitDistance: 220,
     followingReleaseTicks: 60,
-    followingGraceTicks: 180,
     followingEliminationTicks: 300,
@@
     const collisionPenalty = car.damaged ? 150 : 0;
     const followingEliminationPenalty = car.training.eliminatedForFollowing ? 5000 : 0;
     const idlePenalty = car.training.idleTicks * 0.05;
-    const prolongedFollowingTicks = Math.max(
-        0,
-        car.training.longestFollowingTicks - CONFIG.followingGraceTicks
-    );
-    const followingPenalty = car.training.followingTicks * 0.1
-        + prolongedFollowingTicks * 5;
 
-    // 短暂跟车用于观察路况是合理的；持续跟车则会快速失分，不能成为高分亲本。
+    // 跟车过程不重复扣分；达到硬阈值后由淘汰标记一次性施加足够大的惩罚。
     return progressReward + overtakeReward
         - collisionPenalty
         - followingEliminationPenalty
-        - idlePenalty
-        - followingPenalty;
+        - idlePenalty;
```

- `AGENTS.md` +1 -1

```diff
-- 第 11 阶段允许最多 180 帧的短暂跟车观察；超过后按最长连续跟车时间快速扣分，并以每辆 1000 分奖励超车，防止稳定跟车成为优势策略。
+- 第 11 阶段跟车期间不逐帧扣分；连续跟车达到 300 帧后直接淘汰并一次性扣 5000 分，避免与硬淘汰机制重复惩罚。
```

- `.agentdocs/index.md` +2 -1

```diff
+- `workflow/20260809164050-remove-following-score-penalty.md` - 删除持续跟车逐帧扣分，仅保留 300 帧硬淘汰和一次性惩罚；维护适应度时读取。
-- 第 11 阶段允许短暂跟车，但连续跟车超过 180 帧后快速扣分；每超越一辆交通车奖励 1000 分。
+- 第 11 阶段跟车过程不逐帧扣分；连续跟车达到 300 帧后直接淘汰并额外扣 5000 分，每超越一辆交通车奖励 1000 分。
```

## 测试用例

### TC-001 淘汰前跟车不扣分

- 类型：适应度测试
- 优先级：高
- 前置条件：两个车辆的距离、超车、碰撞和闲置状态相同，其中一辆累计跟车 299 帧。
- 操作步骤：分别计算适应度。
- 预期结果：两车得分相同。
- 是否通过：通过。

### TC-002 第 300 帧仍然淘汰

- 类型：回归测试
- 优先级：高
- 前置条件：车辆连续跟车 299 帧。
- 操作步骤：产生第 300 个跟车命中帧。
- 预期结果：车辆立即停止，设置跟车淘汰标记。
- 是否通过：通过。

### TC-003 淘汰一次性惩罚

- 类型：适应度测试
- 优先级：高
- 前置条件：车辆因跟车被淘汰。
- 操作步骤：与同碰撞状态但非跟车淘汰车辆比较得分。
- 预期结果：跟车淘汰车辆额外减少 5000 分。
- 是否通过：通过。

