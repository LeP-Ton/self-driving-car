# 新增训练参数面板

## 背景与目标

- 世代长度、种群车辆数和变异强度原先写死在代码中，调整需要编辑源码。
- 在第 11 阶段控制面板提供可校验、可持久化的训练参数配置。

## 约束与原则

- 参数只在下一代生效，避免当前代评测规则中途变化。
- 所有输入必须限制在安全范围。
- 种群缩小时，精英和随机新个体数量必须自动适配，不能越界。
- 生效后的设置随 V6 训练状态持久化。

## 阶段与 TODO

- [x] 新增世代长度输入。
- [x] 新增种群车辆数输入。
- [x] 新增变异强度输入。
- [x] 实现下一代延迟生效。
- [x] 实现输入范围校验和回写。
- [x] 使遗传流程适配可变种群大小。
- [x] 保存并恢复当前训练设置。
- [x] 验证默认值、参数切换和边界值。

## 参数范围

- 世代长度：500～50000 个模拟帧，默认 5000。
- 车辆数：10～500，默认 100。
- 变异强度：0～1，默认 0.1。

## 关键风险

- 增大车辆数和世代长度会显著提高浏览器计算量。
- 变异强度过低可能长期停留在局部最优，过高可能破坏已有优秀策略。
- 不同世代长度产生的累计原始分数不宜直接比较，后续可增加每千帧标准化指标。

## 当前进展

- 参数面板已可用，点击“应用到下一代”后在换代时统一生效。
- 生效参数会写入训练状态，刷新页面后继续使用。

## 代码变更

- `11. Automated generations/index.html` +18

```diff
+            <fieldset class="training-settings">
+                <legend>下一代训练参数</legend>
+                <label>
+                    世代长度（帧）
+                    <input id="generationTicksInput" type="number" min="500" max="50000" step="500" value="5000">
+                </label>
+                <label>
+                    车辆数
+                    <input id="populationSizeInput" type="number" min="10" max="500" step="10" value="100">
+                </label>
+                <label>
+                    变异强度
+                    <input id="mutationAmountInput" type="number" min="0" max="1" step="0.01" value="0.1">
+                </label>
+                <button type="button" onclick="applyTrainingSettings()">应用到下一代</button>
+            </fieldset>
```

- `11. Automated generations/style.css` +31 -1

```diff
+.training-settings {
+    display: grid;
+    gap: 10px;
+    margin: 20px 0 0;
+    padding: 14px;
+    border: 1px solid #505665;
+    border-radius: 6px;
+}
+
+.training-settings legend {
+    padding: 0 6px;
+    color: #c5cad3;
+}
+
+.training-settings label {
+    display: grid;
+    grid-template-columns: 1fr 90px;
+    align-items: center;
+    gap: 10px;
+    color: #c5cad3;
+    font-size: 14px;
+}
+
+.training-settings input {
+    width: 100%;
+    border: 1px solid #505665;
+    border-radius: 6px;
+    padding: 8px;
+    background: #1d2026;
+    color: inherit;
+    font-variant-numeric: tabular-nums;
+}
@@
 button,
-select {
+select,
+input {
```

- `11. Automated generations/main.js` +94 -19

```diff
 const CONFIG = Object.freeze({
-    populationSize: 100,
     eliteCount: 5,
     parentPoolSize: 10,
     randomImmigrantCount: 10,
-    mutationAmount: 0.1,
-    maxTicksPerGeneration: 5000,
@@
+const DEFAULT_TRAINING_SETTINGS = Object.freeze({
+    generationTicks: 5000,
+    populationSize: 100,
+    mutationAmount: 0.1
+});
@@
 const persistedState = loadTrainingState();
+let trainingSettings = sanitizeTrainingSettings(persistedState.settings);
+let pendingTrainingSettings = { ...trainingSettings };
@@
 startGeneration(createInitialBrains());
+syncTrainingSettingsControls();
@@
-    while (brains.length < CONFIG.populationSize) {
+    while (brains.length < trainingSettings.populationSize) {
@@
-        NeuralNetwork.mutate(brain, CONFIG.mutationAmount);
+        NeuralNetwork.mutate(brain, trainingSettings.mutationAmount);
@@
-    for (let index = 0; index < CONFIG.populationSize; index++) {
+    for (let index = 0; index < trainingSettings.populationSize; index++) {
@@
-    setStatus(`第 ${generation} 代开始，共 ${CONFIG.populationSize} 辆车。`);
+    setStatus(`第 ${generation} 代开始，共 ${trainingSettings.populationSize} 辆车。`);
@@
-    if (allDamaged || generationTick >= CONFIG.maxTicksPerGeneration || stagnated || forceFinish) {
+    if (allDamaged || generationTick >= trainingSettings.generationTicks || stagnated || forceFinish) {
@@
+    activatePendingTrainingSettings();
+
+    const targetPopulation = trainingSettings.populationSize;
+    const eliteCount = Math.min(CONFIG.eliteCount, targetPopulation, rankedCars.length);
+    const randomImmigrantCount = Math.min(
+        CONFIG.randomImmigrantCount,
+        targetPopulation - eliteCount
+    );
     const nextBrains = [];
-    for (let index = 0; index < CONFIG.eliteCount; index++) {
+    for (let index = 0; index < eliteCount; index++) {
@@
-    const parentPool = rankedCars.slice(0, CONFIG.parentPoolSize);
-    const inheritedCount = CONFIG.populationSize - CONFIG.randomImmigrantCount;
+    const parentPool = rankedCars.slice(0, Math.min(CONFIG.parentPoolSize, rankedCars.length));
+    const inheritedCount = targetPopulation - randomImmigrantCount;
@@
-        NeuralNetwork.mutate(childBrain, CONFIG.mutationAmount);
+        NeuralNetwork.mutate(childBrain, trainingSettings.mutationAmount);
@@
-    while (nextBrains.length < CONFIG.populationSize) {
+    while (nextBrains.length < targetPopulation) {
@@
-    const progress = generationTick / CONFIG.maxTicksPerGeneration * 100;
+    const progress = generationTick / trainingSettings.generationTicks * 100;
@@
-    document.getElementById("aliveValue").textContent = `${aliveCount} / ${CONFIG.populationSize}`;
+    document.getElementById("aliveValue").textContent = `${aliveCount} / ${trainingSettings.populationSize}`;
@@
-    document.getElementById("mutationValue").textContent = CONFIG.mutationAmount.toFixed(2);
+    document.getElementById("mutationValue").textContent = trainingSettings.mutationAmount.toFixed(2);
 }
+
+function applyTrainingSettings() {
+    pendingTrainingSettings = sanitizeTrainingSettings({
+        generationTicks: document.getElementById("generationTicksInput").value,
+        populationSize: document.getElementById("populationSizeInput").value,
+        mutationAmount: document.getElementById("mutationAmountInput").value
+    });
+    syncTrainingSettingsControls(pendingTrainingSettings);
+    setStatus(
+        `参数已保存，将在第 ${generation + 1} 代生效：`
+        + `${pendingTrainingSettings.generationTicks} 帧、`
+        + `${pendingTrainingSettings.populationSize} 辆车、`
+        + `变异 ${pendingTrainingSettings.mutationAmount.toFixed(2)}。`
+    );
+}
+
+function activatePendingTrainingSettings() {
+    trainingSettings = { ...pendingTrainingSettings };
+    syncTrainingSettingsControls();
+}
+
+function sanitizeTrainingSettings(settings = {}) {
+    return {
+        generationTicks: clampNumber(settings.generationTicks, 500, 50000, 5000, true),
+        populationSize: clampNumber(settings.populationSize, 10, 500, 100, true),
+        mutationAmount: clampNumber(settings.mutationAmount, 0, 1, 0.1, false)
+    };
+}
+
+function clampNumber(value, min, max, fallback, integer) {
+    const parsed = Number(value);
+    if (!Number.isFinite(parsed)) return fallback;
+    const clamped = Math.max(min, Math.min(max, parsed));
+    return integer ? Math.round(clamped) : clamped;
+}
+
+function syncTrainingSettingsControls(settings = trainingSettings) {
+    document.getElementById("generationTicksInput").value = settings.generationTicks;
+    document.getElementById("populationSizeInput").value = settings.populationSize;
+    document.getElementById("mutationAmountInput").value = settings.mutationAmount;
+}
@@
         generation,
         bestEver,
-        history
+        history,
+        settings: trainingSettings
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段面板可配置下一代的世代长度（500～50000 帧）、车辆数（10～500）和变异强度（0～1）；参数经校验后在换代时生效并持久化。
```

- `.agentdocs/index.md` +2

```diff
+- `workflow/20260809162623-add-training-settings-panel.md` - 面板新增世代长度、车辆数和变异强度配置，下一代生效并持久化；调整训练规模时读取。
+- 第 11 阶段面板可设置下一代世代长度 500～50000 帧、车辆数 10～500、变异强度 0～1；应用后在换代时生效并保存到 V6 状态。
```

## 测试用例

### TC-001 下一代生效

- 类型：功能测试
- 优先级：高
- 前置条件：当前代为默认参数。
- 操作步骤：输入 12000 帧、30 辆、0.25，点击应用并结束当前代。
- 预期结果：当前代保持不变，下一代使用 30 辆车、12000 帧和 0.25 变异。
- 是否通过：通过。

### TC-002 输入边界校验

- 类型：边界测试
- 优先级：高
- 前置条件：打开训练设置。
- 操作步骤：输入超出上下限或非数字内容。
- 预期结果：参数被限制在声明范围，非法数字回退到默认值。
- 是否通过：通过。

### TC-003 设置持久化

- 类型：持久化测试
- 优先级：高
- 前置条件：自定义参数已在新世代生效并完成保存。
- 操作步骤：刷新页面。
- 预期结果：恢复保存的世代长度、车辆数和变异强度。
- 是否通过：通过。

