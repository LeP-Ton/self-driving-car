# 防止世代训练长期停滞

## 背景与目标

- 1× 模拟速度下进入下一代后，坏亲本可能使种群长时间没有前进行为；5× 因更快跑过相同模拟帧数而不易察觉。
- 为世代引入明确的停滞结束条件和随机新个体，确保训练能自行恢复探索。

## 约束与原则

- 模拟速度只改变每个动画帧执行的模拟次数，不改变遗传和评分规则。
- 不强制神经网络输出前进，保留自然选择的真实性。
- 停滞恢复必须自动完成，不要求用户切换到高倍速。

## 阶段与 TODO

- [x] 增加连续无前进检测。
- [x] 停滞达到阈值后自动结算当前世代。
- [x] 每代注入完全随机的新个体。
- [x] 在状态栏展示当前世代的结束原因。
- [x] 更新项目认知和文档索引。
- [x] 使用全体不前进的大脑验证自动恢复。

## 关键设计

- 以全种群最大前进距离作为停滞指标。
- 最大前进距离每增加 1 像素就刷新最后进展帧。
- 连续 180 帧没有新增进展时自动换代；在约 60 FPS 下对应约 3 秒。
- 下一代由 5 个精英、85 个交叉变异后代和 10 个完全随机新个体组成。

## 关键风险

- 低帧率设备上 180 个模拟帧对应的现实时间会更长，但模拟规则保持一致。
- 随机新个体会降低部分短期平均成绩，但能降低种群永久陷入局部最优的风险。

## 当前进展

- 1× 速度下不再需要等待完整 5000 帧才能淘汰停滞种群。
- 世代结束提示会明确显示“全部损毁”“连续无前进”“达到上限”或“手动结算”。

## 代码变更

- `11. Automated generations/main.js` +39 -4

```diff
     eliteCount: 5,
     parentPoolSize: 10,
+    randomImmigrantCount: 10,
     mutationAmount: 0.1,
     maxTicksPerGeneration: 5000,
+    stagnationTicks: 180,
@@
 let forceFinish = false;
+let bestProgress = 0;
+let lastProgressTick = 0;
@@
     generationTick = 0;
     forceFinish = false;
+    bestProgress = 0;
+    lastProgressTick = 0;
@@
     bestCar = cars.reduce((best, car) =>
         car.training.score > best.training.score ? car : best
     );
 
+    const currentBestProgress = Math.max(
+        ...cars.map(car => car.training.startY - car.y)
+    );
+    if (currentBestProgress > bestProgress + 1) {
+        bestProgress = currentBestProgress;
+        lastProgressTick = generationTick;
+    }
+
     const allDamaged = cars.every(car => car.damaged);
-    if (allDamaged || generationTick >= CONFIG.maxTicksPerGeneration || forceFinish) {
-        evolveNextGeneration();
+    const stagnated = generationTick - lastProgressTick >= CONFIG.stagnationTicks;
+    if (allDamaged || generationTick >= CONFIG.maxTicksPerGeneration || stagnated || forceFinish) {
+        const reason = forceFinish
+            ? "手动提前结算"
+            : allDamaged
+                ? "全部车辆损毁"
+                : stagnated
+                    ? "连续无前进，自动结束停滞世代"
+                    : "达到最大模拟帧数";
+        evolveNextGeneration(reason);
     }
 }
@@
-function evolveNextGeneration() {
+function evolveNextGeneration(reason) {
@@
-    while (nextBrains.length < CONFIG.populationSize) {
+    const inheritedCount = CONFIG.populationSize - CONFIG.randomImmigrantCount;
+    while (nextBrains.length < inheritedCount) {
         const parentA = tournamentSelect(parentPool);
         const parentB = tournamentSelect(parentPool);
         const childBrain = crossoverBrains(parentA.brain, parentB.brain);
         NeuralNetwork.mutate(childBrain, CONFIG.mutationAmount);
         nextBrains.push(childBrain);
     }
+
+    // 每代保留少量完全随机个体，防止整个种群被坏亲本锁死在同一种行为上。
+    while (nextBrains.length < CONFIG.populationSize) {
+        nextBrains.push(new NeuralNetwork([5, 6, 4]));
+    }
@@
-    setStatus(`第 ${generation - 1} 代结束，冠军得分 ${formatScore(championScore)}；已自动进入第 ${generation} 代。`);
+    setStatus(`第 ${generation - 1} 代因“${reason}”结束，冠军得分 ${formatScore(championScore)}；已进入第 ${generation} 代。`);
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段连续 180 帧无新增前进距离时自动结束停滞世代，并在每代加入 10 个随机个体以维持种群多样性。
```

- `.agentdocs/index.md` +2

```diff
+- `workflow/20260809150033-prevent-generation-stagnation.md` - 增加停滞检测和随机新个体，修复 1× 速度下换代后长期无动作；排查训练卡住时读取。
+- 第 11 阶段连续 180 帧没有新增前进距离会自动换代，每代固定注入 10 个完全随机个体，避免坏亲本导致永久停滞。
```

## 测试用例

### TC-001 1× 下停滞自动换代

- 类型：功能测试
- 优先级：高
- 前置条件：将当代所有网络设置为不输出任何控制。
- 操作步骤：以 1× 速度执行 180 个模拟帧。
- 预期结果：当前代因连续无前进自动结束，代数增加 1。
- 是否通过：通过。

### TC-002 随机个体注入

- 类型：逻辑测试
- 优先级：高
- 前置条件：任意世代完成结算。
- 操作步骤：检查下一代的 100 个大脑来源。
- 预期结果：5 个为精英，85 个为交叉变异后代，10 个为全新随机网络。
- 是否通过：通过代码审查。

### TC-003 速度不改变进化规则

- 类型：回归测试
- 优先级：高
- 前置条件：分别选择 1× 和 5×。
- 操作步骤：比较相同模拟帧数下的停滞阈值与种群构成。
- 预期结果：两种速度均在连续 180 个无进展模拟帧后换代，只是现实耗时不同。
- 是否通过：通过代码审查。

