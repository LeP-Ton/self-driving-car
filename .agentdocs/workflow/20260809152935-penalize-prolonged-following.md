# 抑制持续跟车并奖励主动超车

## 背景与目标

- 仅用前进距离衡量时，车辆可以跟随速度为 2 的交通车持续获得大量分数，不需要学习变道超车。
- 调整第 11 阶段适应度，使短暂观察仍被允许，但持续跟车不能进入优势亲本池。

## 约束与原则

- 不要求车辆看到前车后立即转向，保留合理的观察和减速时间。
- 惩罚训练目标而非强制控制输出，车辆仍由神经网络自主决定动作。
- 显示超车与跟车指标，使训练目标可以被直接观察。

## 阶段与 TODO

- [x] 定义同车道前车和跟车距离。
- [x] 记录累计、连续和最长连续跟车帧数。
- [x] 增加持续跟车惩罚并提高超车奖励。
- [x] 在控制面板展示最佳车辆的超车数和最长跟车时间。
- [x] 升级存储版本，隔离已经形成跟车策略的旧大脑。
- [x] 对短暂跟车、持续跟车和成功超车进行评分测试。

## 关键设计

- 前车位于当前车前方 150 像素内，且横向距离小于两车总宽的 75% 时视为跟车。
- 前 180 个连续跟车帧作为观察宽限期。
- 所有跟车帧每帧扣 0.1；超过宽限期的最长连续跟车帧额外每帧扣 5。
- 每超越一辆交通车奖励 1000 分。
- 使用最长连续跟车而非当前连续值，避免车辆在代末短暂离开车道就清除历史惩罚。

## 关键风险

- 跟车判断使用几何位置近似，不等同于真实道路中的车道识别。
- 180 帧宽限和惩罚权重属于启发式参数，需结合长期训练结果调整。
- 更强调超车可能增加早期种群的碰撞率，这是探索主动变道策略的预期代价。

## 当前进展

- 持续跟车策略不再能仅凭前进距离获得高分。
- V3 会从新随机种群开始，不继承 V2 的跟车大脑。

## 代码变更

- `11. Automated generations/index.html` +2

```diff
+                <div><dt>最佳车超车数</dt><dd id="overtakeValue">0</dd></div>
+                <div><dt>最长连续跟车</dt><dd id="followingValue">0 帧</dd></div>
```

- `11. Automated generations/main.js` +50 -7

```diff
     maxTicksPerGeneration: 5000,
     stagnationTicks: 180,
-    // V2 调整了适应度规则，避免加载 V1 中可能已经收敛到“原地存活”的大脑。
-    storageKey: "selfDrivingCarGenerationStateV2"
+    followingDistance: 150,
+    followingGraceTicks: 180,
+    // V3 增加持续跟车惩罚，避免加载已经收敛到跟车策略的旧大脑。
+    storageKey: "selfDrivingCarGenerationStateV3"
@@
             aliveTicks: 0,
             idleTicks: 0,
+            followingTicks: 0,
+            consecutiveFollowingTicks: 0,
+            longestFollowingTicks: 0,
             overtakenTraffic: new Set(),
@@
         if (!car.damaged && Math.abs(car.speed) < 0.1) {
             car.training.idleTicks++;
         }
+        updateFollowingState(car);
@@
+function updateFollowingState(car) {
+    if (car.damaged) {
+        car.training.consecutiveFollowingTicks = 0;
+        return;
+    }
+
+    const isFollowing = traffic.some(vehicle => {
+        const forwardGap = car.y - vehicle.y;
+        const sameLaneThreshold = (car.width + vehicle.width) * 0.75;
+        return forwardGap > 0
+            && forwardGap <= CONFIG.followingDistance
+            && Math.abs(car.x - vehicle.x) < sameLaneThreshold;
+    });
+
+    if (isFollowing) {
+        car.training.followingTicks++;
+        car.training.consecutiveFollowingTicks++;
+        car.training.longestFollowingTicks = Math.max(
+            car.training.longestFollowingTicks,
+            car.training.consecutiveFollowingTicks
+        );
+    } else {
+        car.training.consecutiveFollowingTicks = 0;
+    }
+}
+
 function calculateFitness(car) {
     const progress = car.training.startY - car.y;
     const progressReward = progress * 2;
-    const overtakeReward = car.training.overtakenTraffic.size * 250;
+    const overtakeReward = car.training.overtakenTraffic.size * 1000;
     const collisionPenalty = car.damaged ? 150 : 0;
     const idlePenalty = car.training.idleTicks * 0.05;
+    const prolongedFollowingTicks = Math.max(
+        0,
+        car.training.longestFollowingTicks - CONFIG.followingGraceTicks
+    );
+    const followingPenalty = car.training.followingTicks * 0.1
+        + prolongedFollowingTicks * 5;
 
-    // 不再按单纯的存活时间奖励；否则原地不动会比尝试驾驶但碰撞的车辆得分更高。
-    return progressReward + overtakeReward - collisionPenalty - idlePenalty;
+    // 短暂跟车用于观察路况是合理的；持续跟车则会快速失分，不能成为高分亲本。
+    return progressReward + overtakeReward
+        - collisionPenalty
+        - idlePenalty
+        - followingPenalty;
@@
+    document.getElementById("overtakeValue").textContent = bestCar?.training.overtakenTraffic.size || 0;
+    document.getElementById("followingValue").textContent = `${bestCar?.training.longestFollowingTicks || 0} 帧`;
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段允许最多 180 帧的短暂跟车观察；超过后按最长连续跟车时间快速扣分，并以每辆 1000 分奖励超车，防止稳定跟车成为优势策略。
```

- `.agentdocs/index.md` +3 -1

```diff
+- `workflow/20260809152935-penalize-prolonged-following.md` - 增加持续跟车识别、惩罚和超车统计，解决种群偏好跟车；调整适应度时读取。
-- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV2`，不会覆盖第 9 阶段的 `bestBrain`；V1 因适应度缺陷不再加载。
+- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV3`，不会覆盖第 9 阶段的 `bestBrain`；旧版适应度训练数据不再加载。
+- 第 11 阶段允许短暂跟车，但连续跟车超过 180 帧后快速扣分；每超越一辆交通车奖励 1000 分。
```

## 测试用例

### TC-001 短暂跟车宽限

- 类型：适应度测试
- 优先级：高
- 前置条件：车辆跟车不超过 180 帧。
- 操作步骤：计算车辆适应度。
- 预期结果：只产生每帧 0.1 的基础跟车成本，不产生每帧 5 的持续惩罚。
- 是否通过：通过。

### TC-002 持续跟车失去选择优势

- 类型：适应度测试
- 优先级：高
- 前置条件：车辆前进 10000 像素，持续跟车 4800 帧且没有超车。
- 操作步骤：计算车辆适应度。
- 预期结果：持续跟车惩罚超过前进奖励，最终得分低于主动超车车辆。
- 是否通过：通过。

### TC-003 超车奖励

- 类型：适应度测试
- 优先级：高
- 前置条件：车辆成功越过交通车。
- 操作步骤：比较超车前后的适应度。
- 预期结果：每辆交通车首次被越过时增加 1000 分，同一车辆不会重复计分。
- 是否通过：通过。

