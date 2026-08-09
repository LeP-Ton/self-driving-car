# 将第 11 阶段简化为存活优先和距离排序

## 背景与目标

- 综合积分包含前进、超车、闲置和终止惩罚，多个人工权重使规则难以理解和调试。
- 回归第 9 阶段“跑得最远”的核心，只将碰撞和长期跟车作为硬淘汰约束。

## 约束与原则

- 未淘汰车辆永远优于已淘汰车辆。
- 淘汰状态相同时只比较前进距离。
- 如果全员淘汰，仍选择其中跑得最远者继续进化。
- 超车数量保留为观察指标，不参与选择。
- 保留自动世代、精英、亲本池、交叉、变异和随机新个体。

## 阶段与 TODO

- [x] 删除前进距离倍数和超车奖励。
- [x] 删除闲置惩罚和终止扣分。
- [x] 删除不再使用的存活、闲置和累计跟车字段。
- [x] 增加存活优先、距离第二的统一比较器。
- [x] 让实时最佳、世代排序和锦标赛选择共用比较器。
- [x] 让历史最佳也先比较存活状态，再比较距离。
- [x] 将面板“分数”文案改为“距离”。
- [x] 升级存储版本并更新中文注释。
- [x] 验证存活、距离、全员淘汰和历史最佳规则。

## 与第 9 阶段的关系

- 第 9 阶段：直接选择 `y` 最小的车辆，碰撞车辆可能在被追上前继续成为最佳。
- 第 11 阶段：先排除已碰撞或长期跟车淘汰车辆，再在同一状态内选择距离最远者。
- 第 11 阶段仍比第 9 阶段多自动世代和完整遗传流程，但不再使用综合积分。

## 关键风险

- 未淘汰但缓慢行驶的车辆会优先于已经跑得很远但最终碰撞的车辆，这是硬约束设计的预期结果。
- V8 使用全新历史指标，旧版积分和距离不可比较，因此不加载 V7。

## 当前进展

- 当前选择规则可以概括为“先不失败，再跑得远”。
- 超车数只显示，不影响冠军或亲本选择。

## 代码变更

- `11. Automated generations/index.html` +2 -2

```diff
-                <div><dt>本代最高分</dt><dd id="currentScoreValue">0</dd></div>
-                <div><dt>历史最高分</dt><dd id="bestScoreValue">0</dd></div>
+                <div><dt>本代最远距离</dt><dd id="currentScoreValue">0</dd></div>
+                <div><dt>历史最远距离</dt><dd id="bestScoreValue">0</dd></div>
```

- `11. Automated generations/main.js`：删除综合积分，统一使用存活与距离比较。

```diff
- * 2. simulateTick：推进车辆、记录行为、计算适应度并判断本代是否结束。
+ * 2. simulateTick：推进车辆、记录行为、计算前进距离并判断本代是否结束。
- * 这里的“最佳车”指实时适应度最高的车，不一定是纵向位置最靠前的车。
+ * “最佳车”优先选择未淘汰车辆；淘汰状态相同时，选择前进距离最远的车辆。
@@
-    // V7 统一了碰撞与跟车淘汰惩罚，旧版评分不再具有可比性。
-    storageKey: "selfDrivingCarGenerationStateV7"
+    // V8 使用“存活优先、距离第二”的简化规则，旧版积分不再具有可比性。
+    storageKey: "selfDrivingCarGenerationStateV8"
@@
-            // 闲置、跟车、超车等行为会参与淘汰或适应度计算。
-            aliveTicks: 0,
-            idleTicks: 0,
-            followingTicks: 0,
+            // 跟车状态只负责触发硬淘汰，超车集合只用于面板统计。
@@
-            score: 0
+            distance: 0
@@
-        if (!car.damaged) car.training.aliveTicks++;
-        if (!car.damaged && Math.abs(car.speed) < 0.1) {
-            car.training.idleTicks++;
-        }
@@
-        car.training.score = calculateFitness(car);
+        car.training.distance = calculateDistance(car);
@@
-    // 实时最佳按综合适应度选择，因此超车、碰撞时可能切换，并非单纯选择最靠前车辆。
+    // 未淘汰车辆永远优先；状态相同时，选择与第 9 阶段一致的最远车辆。
     bestCar = cars.reduce((best, car) =>
-        car.training.score > best.training.score ? car : best
+        compareCarsForSelection(car, best) > 0 ? car : best
@@
-        car.training.followingTicks++;
@@
-// ==================== 适应度与遗传算法 ====================
+// ==================== 距离排序与遗传算法 ====================
 
 /**
- * 计算适应度（越高越好）：
- * 前进距离 × 2 + 超车数量 × 1000 - 终止型失败 5000 - 闲置帧数 × 0.05。
- * 撞道路、撞交通车、长期跟车淘汰都通过 damaged 统一扣一次 5000。
+ * 与第 9 阶段相同，只计算车辆从起点向前行驶的距离。
+ * 碰撞和长期跟车通过 damaged 作为硬淘汰条件，不再换算成人工分数。
  */
-function calculateFitness(car) {
-    const progress = car.training.startY - car.y;
-    const progressReward = progress * 2;
-    const overtakeReward = car.training.overtakenTraffic.size * 1000;
-    const eliminationPenalty = car.damaged ? 5000 : 0;
-    const idlePenalty = car.training.idleTicks * 0.05;
-    return progressReward + overtakeReward
-        - eliminationPenalty
-        - idlePenalty;
+function calculateDistance(car) {
+    return car.training.startY - car.y;
+}
+
+/**
+ * 比较两辆车的选择优先级：
+ * 1. 未淘汰车辆一定优于已淘汰车辆。
+ * 2. 两车淘汰状态相同时，前进距离更远者更优。
+ * 3. 如果全员淘汰，仍能从失败车辆中选择距离最远者继续进化。
+ */
+function compareCarsForSelection(left, right) {
+    if (left.damaged !== right.damaged) {
+        return left.damaged ? -1 : 1;
+    }
+    return left.training.distance - right.training.distance;
 }
@@
- * 1. 按适应度排名并保存本代冠军。
+ * 1. 按“存活优先、距离第二”排名并保存本代冠军。
@@
-    const rankedCars = [...cars].sort(
-        (left, right) => right.training.score - left.training.score
-    );
+    const rankedCars = [...cars].sort(
+        (left, right) => compareCarsForSelection(right, left)
+    );
     const champion = rankedCars[0];
-    const championScore = champion.training.score;
+    const championDistance = champion.training.distance;
+    const championSurvived = !champion.damaged;
 
-    history.push({ generation, score: championScore });
+    history.push({ generation, distance: championDistance, survived: championSurvived });
     history = history.slice(-30);
-    if (!bestEver || championScore > bestEver.score) {
-        bestEver = { score: championScore, brain: cloneBrain(champion.brain) };
+    if (isBetterThanHistoricalBest(champion)) {
+        bestEver = {
+            distance: championDistance,
+            survived: championSurvived,
+            brain: cloneBrain(champion.brain)
+        };
@@
-    setStatus(`第 ${generation - 1} 代因“${reason}”结束，冠军得分 ${formatScore(championScore)}；已进入第 ${generation} 代。`);
+    setStatus(`第 ${generation - 1} 代因“${reason}”结束，冠军距离 ${formatDistance(championDistance)}；已进入第 ${generation} 代。`);
 }
+
+/** 历史记录同样先比较是否存活，再比较前进距离。 */
+function isBetterThanHistoricalBest(champion) {
+    if (!bestEver) return true;
+    const championSurvived = !champion.damaged;
+    if (championSurvived !== bestEver.survived) {
+        return championSurvived;
+    }
+    return champion.training.distance > bestEver.distance;
+}
@@
- * 锦标赛选择：随机抽取三个候选，返回其中得分最高者。
+ * 锦标赛选择：随机抽取三个候选，返回其中选择优先级最高者。
+ * 它让存活且距离更远的车辆更容易成为亲本，同时不给第一名绝对垄断权。
@@
-    const confirmed = window.confirm("确定清空代数、历史最高分和已保存的大脑吗？");
+    const confirmed = window.confirm("确定清空代数、历史最远距离和已保存的大脑吗？");
@@
-        car.training.score > best.training.score ? car : best
+        compareCarsForSelection(car, best) > 0 ? car : best
@@
-    document.getElementById("currentScoreValue").textContent = formatScore(bestCar?.training.score || 0);
-    document.getElementById("bestScoreValue").textContent = formatScore(bestEver?.score || 0);
+    document.getElementById("currentScoreValue").textContent = formatDistance(bestCar?.training.distance || 0);
+    document.getElementById("bestScoreValue").textContent = formatDistance(bestEver?.distance || 0);
@@
-/** 所有分数统一显示一位小数。 */
-function formatScore(score) {
-    return Number(score).toFixed(1);
+/** 所有距离统一显示一位小数。 */
+function formatDistance(distance) {
+    return Number(distance).toFixed(1);
 }
```

- `AGENTS.md`：将旧积分认知替换为硬淘汰与距离排序。

```diff
-- 第 11 阶段适应度不能奖励单纯存活时间；当前使用前进、超车奖励及碰撞、闲置惩罚，避免种群收敛到“原地不动”。
+- 第 11 阶段采用与第 9 阶段接近的简化选择规则：未淘汰车辆永远优先，淘汰状态相同时只比较前进距离；超车数仅展示，不参与选择。
-- 第 11 阶段跟车期间不逐帧扣分；连续跟车达到 300 帧后直接淘汰并一次性扣 5000 分，避免与硬淘汰机制重复惩罚。
-- 第 11 阶段连续跟车达到 300 帧时直接淘汰该个体并额外扣 5000 分；不采用强制转向，以免绕过神经网络或转入有车的相邻车道。
+- 第 11 阶段连续跟车达到 300 帧时直接淘汰该个体，不换算为扣分；不采用强制转向，以免绕过神经网络或转入有车的相邻车道。
-- 第 11 阶段撞道路、撞交通车和长期跟车淘汰均视为终止型失败，统一一次性扣 5000 分；若全员失败，仍按扣分前后的相对表现选择亲本。
+- 第 11 阶段撞道路、撞交通车和长期跟车均属于硬淘汰；如果全员淘汰，仍从中选择前进距离最远者作为亲本。
```

- `.agentdocs/index.md`：新增本记录并将当前规则、存储版本更新为 V8。

```diff
+- `workflow/20260809182541-simplify-selection-by-distance.md` - 将综合积分简化为“存活优先、距离第二”，对齐第 9 阶段最远距离思路；理解当前选择规则时读取。
-- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV7`，不会覆盖第 9 阶段的 `bestBrain`；旧版不同淘汰评分不再加载。
+- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV8`，不会覆盖第 9 阶段的 `bestBrain`；旧版综合积分不再加载。
+- 第 11 阶段不再使用综合积分：未淘汰车辆优先，状态相同时只比较前进距离；全员淘汰时选择其中跑得最远者。
```

## 测试用例

### TC-001 存活车辆优先

- 类型：选择规则测试
- 优先级：高
- 前置条件：存活车辆行驶 100，淘汰车辆行驶 10000。
- 预期结果：选择存活车辆。
- 是否通过：通过。

### TC-002 同状态距离优先

- 类型：选择规则测试
- 优先级：高
- 前置条件：两辆车均存活或均淘汰，距离不同。
- 预期结果：选择距离更远车辆。
- 是否通过：通过。

### TC-003 全员淘汰仍可进化

- 类型：遗传回归测试
- 优先级：高
- 前置条件：本代全部车辆淘汰。
- 预期结果：按距离排序并选择跑得最远者作为冠军和亲本。
- 是否通过：通过。

### TC-004 历史最佳存活优先

- 类型：持久化选择测试
- 优先级：高
- 前置条件：历史记录来自淘汰车辆，新冠军为距离较短的存活车辆。
- 预期结果：新存活冠军替换历史淘汰冠军；淘汰冠军不能替换存活历史冠军。
- 是否通过：通过。
