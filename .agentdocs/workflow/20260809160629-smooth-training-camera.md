# 平滑自动训练镜头

## 背景与目标

- 无限交通训练中车道画面间歇性上下抖动。
- 区分交通车回收与镜头跳动，消除最佳车辆切换造成的视口瞬移。

## 约束与原则

- 只调整渲染镜头，不改变车辆物理位置、传感器、评分或进化结果。
- 兼容 1×、5× 和 20× 模拟速度。
- 换代后镜头立即回到新种群起点，避免跨世代缓慢滚动。

## 阶段与 TODO

- [x] 检查交通回收与 Canvas 坐标变换。
- [x] 确认镜头直接绑定实时最佳车坐标。
- [x] 增加镜头独立纵向状态。
- [x] 使用线性插值平滑目标位置。
- [x] 使用随模拟速度变化的最大步长限制镜头跳跃。
- [x] 验证大幅切换、正常跟随和换代重置。

## 根因

- `bestCar` 每个模拟帧都按实时适应度重新选择。
- 无限交通中某辆车刚超车会瞬间增加 1000 分，最佳车辆可能频繁切换。
- 旧绘制直接使用 `-bestCar.y` 平移 Canvas；两辆候选车的纵向差会直接表现为整个道路瞬移。
- 交通车回收发生在领先 AI 后方或视野前方，通常不是整条道路抖动的直接原因。

## 关键设计

- 使用独立 `cameraY` 保存镜头位置。
- 每帧以 0.15 系数向当前最佳车辆位置线性插值。
- 1× 下单帧最大移动 8 像素；5×、20× 按倍速扩展，防止高倍速时车辆跑出镜头。
- 新世代开始时将 `cameraY` 重置为起点车辆位置。

## 关键风险

- 镜头会相对最佳车辆产生少量预期延迟。
- 右侧神经网络仍展示实时最佳车辆；最佳车频繁切换时网络内容可能变化，但不会影响左侧道路位置。

## 当前进展

- 最佳车辆切换不再造成道路瞬间跳跃。
- 交通流回收和训练逻辑保持不变。

## 代码变更

- `11. Automated generations/main.js` +17 -1

```diff
     trafficCount: 10,
     trafficRecycleBehindDistance: 400,
+    cameraSmoothing: 0.15,
+    cameraBaseMaxStep: 8,
@@
 let trafficPatternIndex = 0;
 let nextTrafficId = 1;
+let cameraY = 100;
@@
     bestCar = cars[0];
+    cameraY = bestCar.y;
@@
 function drawSimulation(time) {
     carCanvas.height = window.innerHeight;
     networkCanvas.height = window.innerHeight;
+    updateCameraPosition();
 
     carCtx.save();
-    carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);
+    carCtx.translate(0, -cameraY + carCanvas.height * 0.7);
@@
+function updateCameraPosition() {
+    const smoothedTarget = lerp(cameraY, bestCar.y, CONFIG.cameraSmoothing);
+    const requestedStep = smoothedTarget - cameraY;
+    const maxStep = CONFIG.cameraBaseMaxStep * Math.max(1, ticksPerFrame);
+    const limitedStep = Math.max(-maxStep, Math.min(maxStep, requestedStep));
+    cameraY += limitedStep;
+}
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段车道画面使用带最大步长限制的平滑镜头跟随最佳车，避免实时最佳车切换造成纵向跳动；换代时镜头重置到新种群起点。
```

- `.agentdocs/index.md` +2

```diff
+- `workflow/20260809160629-smooth-training-camera.md` - 为最佳车跟随镜头增加平滑和限速，消除无限交通训练中的画面抖动；维护渲染镜头时读取。
+- 第 11 阶段镜头不再直接绑定实时最佳车坐标，而是使用 0.15 平滑系数和随模拟倍速调整的最大步长进行跟随。
```

## 测试用例

### TC-001 最佳车大幅切换

- 类型：渲染逻辑测试
- 优先级：高
- 前置条件：1× 下新最佳车与当前镜头相差 1000 像素。
- 操作步骤：更新一次镜头位置。
- 预期结果：镜头只移动 8 像素，不发生 1000 像素瞬移。
- 是否通过：通过。

### TC-002 高倍速镜头跟随

- 类型：渲染逻辑测试
- 优先级：高
- 前置条件：模拟速度为 5× 或 20×。
- 操作步骤：更新镜头位置。
- 预期结果：最大跟随步长随倍速扩大，最佳车辆不会因模拟推进过快长期离开视野。
- 是否通过：通过。

### TC-003 换代镜头重置

- 类型：回归测试
- 优先级：中
- 前置条件：上一代已行驶较远。
- 操作步骤：开始新世代。
- 预期结果：镜头立即重置到新车辆起点，不从上一代位置缓慢返回。
- 是否通过：通过。

