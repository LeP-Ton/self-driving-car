# 修复第二代车辆收敛到原地不动

## 背景与目标

- 第 11 阶段在进入第二代后，部分随机训练会出现车辆集体不动。
- 定位世代切换、车辆更新和遗传流程，修复会鼓励“原地存活”的适应度漏洞。

## 约束与原则

- 保留自动世代、精英保留、交叉和变异机制。
- 不通过强制车辆前进掩盖问题，而是让适应度正确区分驾驶和闲置。
- 旧评分下产生的大脑不应继续污染新种群。

## 阶段与 TODO

- [x] 使用无界面运行环境复现第一代到第二代切换。
- [x] 验证世代切换后车辆更新循环仍在运行。
- [x] 定位单纯存活奖励造成的奖励投机。
- [x] 使用前进、超车奖励和碰撞、闲置惩罚重构评分。
- [x] 升级本地存储版本，隔离旧的劣化大脑。
- [x] 执行语法与两代模拟验证。

## 根因

- 原评分每存活一帧奖励 `0.02`，一代 5000 帧最多可在完全不动的情况下获得 100 分。
- 原地车辆不会撞车；当随机第一代缺少成功驾驶者时，这类车辆可能进入前 10 名亲本池。
- 第二代集中继承这些大脑后，会表现为全部车辆停在起点。

## 关键风险

- 新评分仍是启发式规则，超车奖励、碰撞惩罚和闲置惩罚可根据长期训练结果继续调整。
- 存储键升级后，旧 V1 训练结果不会自动迁移。

## 当前进展

- 已取消单纯存活奖励。
- 前进距离按 2 倍计分，单次超车奖励提高到 250，碰撞扣 150，闲置每帧扣 0.05。
- 存储键升级为 `selfDrivingCarGenerationStateV2`，页面会自动从新的随机第一代开始。

## 代码变更

- `11. Automated generations/main.js` +12 -5

```diff
-    storageKey: "selfDrivingCarGenerationStateV1"
+    // V2 调整了适应度规则，避免加载 V1 中可能已经收敛到“原地存活”的大脑。
+    storageKey: "selfDrivingCarGenerationStateV2"
@@
             startY: car.y,
             aliveTicks: 0,
+            idleTicks: 0,
             overtakenTraffic: new Set(),
@@
         car.update(road.borders, traffic);
         if (!car.damaged) car.training.aliveTicks++;
+        if (!car.damaged && Math.abs(car.speed) < 0.1) {
+            car.training.idleTicks++;
+        }
@@
 function calculateFitness(car) {
     const progress = car.training.startY - car.y;
-    const survivalReward = car.training.aliveTicks * 0.02;
-    const overtakeReward = car.training.overtakenTraffic.size * 200;
-    const collisionPenalty = car.damaged ? 100 : 0;
-    return progress + survivalReward + overtakeReward - collisionPenalty;
+    const progressReward = progress * 2;
+    const overtakeReward = car.training.overtakenTraffic.size * 250;
+    const collisionPenalty = car.damaged ? 150 : 0;
+    const idlePenalty = car.training.idleTicks * 0.05;
+
+    // 不再按单纯的存活时间奖励；否则原地不动会比尝试驾驶但碰撞的车辆得分更高。
+    return progressReward + overtakeReward - collisionPenalty - idlePenalty;
 }
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段适应度不能奖励单纯存活时间；当前使用前进、超车奖励及碰撞、闲置惩罚，避免种群收敛到“原地不动”。
```

- `.agentdocs/index.md` +3 -1

```diff
+- `workflow/20260809145353-fix-generation-idle-convergence.md` - 修复第二代可能集体不动的问题；分析适应度设计或训练停滞时读取。
-- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV1`，不会覆盖第 9 阶段的 `bestBrain`。
+- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV2`，不会覆盖第 9 阶段的 `bestBrain`；V1 因适应度缺陷不再加载。
+- 第 11 阶段不奖励单纯存活时间，通过闲置惩罚避免不动车辆占据亲本池。
```

## 测试用例

### TC-001 世代切换循环正常

- 类型：逻辑测试
- 优先级：高
- 前置条件：使用空本地存储启动模拟。
- 操作步骤：运行完整 5000 帧，再运行第二代 300 帧。
- 预期结果：代数变为 2，第二代帧数正常增长，存在移动和存活车辆。
- 是否通过：通过。

### TC-002 闲置车辆持续扣分

- 类型：单元逻辑测试
- 优先级：高
- 前置条件：车辆速度绝对值小于 0.1 且未损毁。
- 操作步骤：连续执行车辆模拟。
- 预期结果：`idleTicks` 持续增加，适应度每帧扣除 0.05，不再获得存活奖励。
- 是否通过：通过代码审查。

### TC-003 旧训练数据隔离

- 类型：持久化测试
- 优先级：高
- 前置条件：浏览器存在 V1 训练数据。
- 操作步骤：加载修复后的第 11 阶段。
- 预期结果：程序只读取 V2 键，以随机种群开始新训练，不加载 V1 大脑。
- 是否通过：通过代码审查，待浏览器验证。

