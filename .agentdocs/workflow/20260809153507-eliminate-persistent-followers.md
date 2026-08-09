# 淘汰持续跟车个体

## 背景与目标

- 持续跟车惩罚可以降低亲本入选概率，但车辆仍会继续占用模拟资源并在画面中长期跟车。
- 增加强制终止条件，使超过容忍时间仍不尝试超车的个体立即退出本代竞争。

## 约束与原则

- 采用淘汰而不是强制转向。
- 不绕过神经网络直接控制方向，避免强制转入有车或道路边界一侧。
- 保留 180 帧观察宽限期和渐进式跟车惩罚。

## 阶段与 TODO

- [x] 增加连续跟车淘汰阈值。
- [x] 记录跟车淘汰原因并停止车辆更新。
- [x] 对淘汰个体施加额外适应度惩罚。
- [x] 在控制面板显示本代跟车淘汰数量。
- [x] 升级存储版本，隔离旧规则训练结果。
- [x] 验证第 299 与第 300 帧的边界行为。

## 关键设计

- 连续跟车第 1～180 帧：观察宽限，只有轻微基础成本。
- 连续跟车第 181～299 帧：逐帧增加持续跟车惩罚。
- 连续跟车达到第 300 帧：设置车辆为损毁状态，停止后续移动，并额外扣除 5000 分。
- 通过 `eliminatedForFollowing` 区分跟车淘汰和普通碰撞。

## 关键风险

- 被淘汰车辆与碰撞车辆共用 `damaged` 停止机制，外观上暂未使用不同标识。
- 300 帧是启发式阈值；模拟帧率约 60 FPS 时相当于约 5 秒的连续跟车。

## 当前进展

- 持续跟车车辆会在第 300 帧立即停止，不再无限跟随交通车。
- 面板可查看本代累计跟车淘汰数。

## 代码变更

- `11. Automated generations/index.html` +1

```diff
+                <div><dt>本代跟车淘汰</dt><dd id="followingEliminatedValue">0</dd></div>
```

- `11. Automated generations/main.js` +16 -2

```diff
     followingDistance: 150,
     followingGraceTicks: 180,
-    // V3 增加持续跟车惩罚，避免加载已经收敛到跟车策略的旧大脑。
-    storageKey: "selfDrivingCarGenerationStateV3"
+    followingEliminationTicks: 300,
+    // V4 增加持续跟车淘汰，避免加载旧规则下保留的跟车大脑。
+    storageKey: "selfDrivingCarGenerationStateV4"
@@
             consecutiveFollowingTicks: 0,
             longestFollowingTicks: 0,
+            eliminatedForFollowing: false,
             overtakenTraffic: new Set(),
@@
         car.training.longestFollowingTicks = Math.max(
             car.training.longestFollowingTicks,
             car.training.consecutiveFollowingTicks
         );
+        if (car.training.consecutiveFollowingTicks >= CONFIG.followingEliminationTicks) {
+            // 不替神经网络选择转向方向；直接停止该个体，避免不安全的强制转向干扰训练。
+            car.training.eliminatedForFollowing = true;
+            car.damaged = true;
+        }
@@
     const collisionPenalty = car.damaged ? 150 : 0;
+    const followingEliminationPenalty = car.training.eliminatedForFollowing ? 5000 : 0;
@@
         - collisionPenalty
+        - followingEliminationPenalty
@@
+    document.getElementById("followingEliminatedValue").textContent = cars.filter(
+        car => car.training.eliminatedForFollowing
+    ).length;
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段连续跟车达到 300 帧时直接淘汰该个体并额外扣 5000 分；不采用强制转向，以免绕过神经网络或转入有车的相邻车道。
```

- `.agentdocs/index.md` +3 -1

```diff
+- `workflow/20260809153507-eliminate-persistent-followers.md` - 连续跟车 300 帧后自动淘汰并扣分；维护跟车治理策略时读取。
-- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV3`，不会覆盖第 9 阶段的 `bestBrain`；旧版适应度训练数据不再加载。
+- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV4`，不会覆盖第 9 阶段的 `bestBrain`；旧版适应度训练数据不再加载。
+- 第 11 阶段连续跟车达到 300 帧会直接淘汰车辆并额外扣 5000 分，不强制替神经网络执行转向。
```

## 测试用例

### TC-001 阈值前不淘汰

- 类型：边界测试
- 优先级：高
- 前置条件：车辆与同车道前车距离小于 150 像素。
- 操作步骤：连续调用跟车状态更新 299 次。
- 预期结果：车辆未被淘汰，`eliminatedForFollowing` 为 `false`。
- 是否通过：通过。

### TC-002 第 300 帧淘汰

- 类型：边界测试
- 优先级：高
- 前置条件：车辆已连续跟车 299 帧。
- 操作步骤：再次更新跟车状态。
- 预期结果：车辆被标记为损毁，`eliminatedForFollowing` 为 `true`。
- 是否通过：通过。

### TC-003 淘汰适应度惩罚

- 类型：适应度测试
- 优先级：高
- 前置条件：两个其他状态相同的车辆，其中一个因跟车被淘汰。
- 操作步骤：分别计算适应度。
- 预期结果：被淘汰车辆额外减少 5000 分。
- 是否通过：通过。

