# 新增测试车最小速度配置

## 背景与目标

- 测试车原先没有可配置的前进速度下限。
- 将测试车最小速度默认设为 0，并在训练配置面板提供 0～3 的配置入口。

## 约束与原则

- 默认值 0 保持原有停车和倒车行为不变。
- 正数最小速度仅应用于 AI 测试车，不改变交通车速度。
- 配置沿用现有训练参数规则，在下一代生效并随训练状态持久化。

## 阶段与 TODO

- [x] 扩展车辆速度模型，支持最小速度。
- [x] 新增测试车最小速度面板输入。
- [x] 接入参数校验、回写、换代生效和持久化流程。
- [x] 更新项目认知与变更索引。
- [x] 完成 JavaScript 语法与 diff 格式检查。

## 参数范围

- 测试车最小速度：0～3，步长 0.05，默认 0。

## 关键风险

- 设置为正数后，神经网络无法通过停车或倒车避障，可能提高碰撞概率。
- 最小速度接近最大速度 3 时，车辆可用于转向决策的反应时间会明显缩短。

## 当前进展

- 面板已新增“测试车最小速度”，点击“应用到下一代”后统一生效。
- 测试车在摩擦计算后应用速度下限；配置为 0 时保留原行为。
- 交通车构造参数未传入最小速度，继续使用默认值 0。

## 代码变更

- `11. Automated generations/car.js` +6 -1

```diff
-    constructor(x, y, width, height, controlType, maxSpeed = 3, color = "blue") {
+    constructor(x, y, width, height, controlType, maxSpeed = 3, color = "blue", minSpeed = 0) {
@@
         this.maxSpeed = maxSpeed;
+        // 最小速度主要供训练测试车使用；默认 0 保持交通车等既有行为不变。
+        this.minSpeed = Math.max(0, Math.min(maxSpeed, minSpeed));
@@
         if (Math.abs(this.speed) < this.friction) this.speed = 0;
+
+        // 配置正数时强制测试车持续前进，配置 0 时仍允许停车或倒车。
+        if (this.minSpeed > 0) this.speed = Math.max(this.speed, this.minSpeed);
```

- `11. Automated generations/index.html` +4

```diff
+                <label>
+                    测试车最小速度
+                    <input id="minSpeedInput" type="number" min="0" max="3" step="0.05" value="0">
+                </label>
```

- `11. Automated generations/main.js` +20 -6

```diff
-// 这三个参数可在面板修改；为保证本代评分公平，只在下一代开始时生效。
+// 这些参数可在面板修改；为保证本代评分公平，只在下一代开始时生效。
 const DEFAULT_TRAINING_SETTINGS = Object.freeze({
     generationTicks: 5000,
     populationSize: 100,
-    mutationAmount: 0.1
+    mutationAmount: 0.1,
+    minSpeed: 0
@@
-        const car = new Car(road.getLaneCenter(1), 100, 30, 50, "AI");
+        const car = new Car(
+            road.getLaneCenter(1),
+            100,
+            30,
+            50,
+            "AI",
+            3,
+            "blue",
+            trainingSettings.minSpeed
+        );
@@
-        mutationAmount: document.getElementById("mutationAmountInput").value
+        mutationAmount: document.getElementById("mutationAmountInput").value,
+        minSpeed: document.getElementById("minSpeedInput").value
@@
-        + `变异 ${pendingTrainingSettings.mutationAmount.toFixed(2)}。`
+        + `变异 ${pendingTrainingSettings.mutationAmount.toFixed(2)}、`
+        + `最小速度 ${pendingTrainingSettings.minSpeed.toFixed(2)}。`
@@
-        mutationAmount: clampNumber(settings.mutationAmount, 0, 1, 0.1, false)
+        mutationAmount: clampNumber(settings.mutationAmount, 0, 1, 0.1, false),
+        minSpeed: clampNumber(settings.minSpeed, 0, 3, 0, false)
@@
     document.getElementById("mutationAmountInput").value = settings.mutationAmount;
+    document.getElementById("minSpeedInput").value = settings.minSpeed;
```

- `AGENTS.md` +1 -1

```diff
-- 第 11 阶段面板可配置下一代的世代长度（500～50000 帧）、车辆数（10～500）和变异强度（0～1）；参数经校验后在换代时生效并持久化。
+- 第 11 阶段面板可配置下一代的世代长度（500～50000 帧）、车辆数（10～500）、变异强度（0～1）和测试车最小速度（0～3，默认 0）；参数经校验后在换代时生效并持久化。
```

- `.agentdocs/index.md` +2

```diff
+- `workflow/20260809201329-add-minimum-test-car-speed.md` - 为测试车增加默认 0、可配置且随下一代生效的最小速度；调整训练车速度下限时读取。
+- 第 11 阶段测试车最小速度默认是 0，可在面板设置为 0～3；正数会限制测试车不能停车或倒车，参数在下一代生效并持久化，交通车不受影响。
```

## 测试用例

### TC-001 默认值兼容

- 类型：功能测试
- 优先级：高
- 操作步骤：以默认配置 0 启动并运行一代。
- 预期结果：测试车仍可停车和倒车，交通车行为不变。
- 是否通过：静态检查通过，浏览器行为待验证。

### TC-002 正数最小速度下一代生效

- 类型：功能测试
- 优先级：高
- 操作步骤：输入 1.5，点击“应用到下一代”，再结束当前代。
- 预期结果：当前代不变；下一代测试车速度不低于 1.5，状态提示显示 1.50。
- 是否通过：静态检查通过，浏览器行为待验证。

### TC-003 输入边界与持久化

- 类型：边界及持久化测试
- 优先级：高
- 操作步骤：分别输入小于 0、大于 3 和合法小数，应用并完成换代后刷新。
- 预期结果：数值被限制到 0～3，合法值在换代保存后可恢复。
- 是否通过：静态检查通过，浏览器行为待验证。
