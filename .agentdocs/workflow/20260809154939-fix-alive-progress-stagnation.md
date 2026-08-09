# 修复存活车辆仍前进却被判定停滞

## 背景与目标

- 训练连续多代停在 11470.5 分，状态栏显示“连续无前进”。
- 排除道路长度和理论分数上限后，修复停滞检测使用历史最远距离造成的误判。

## 约束与原则

- 保留 180 帧无进展自动结束机制。
- 只以仍存活车辆的实际前进判断当前种群是否停滞。
- 保留 V5 存档，不丢弃已训练 61 代的历史最佳大脑。

## 阶段与 TODO

- [x] 核对道路长度、单代帧数和评分上限。
- [x] 根据世代结束原因定位停滞检测。
- [x] 移除包含损毁车辆的全局历史最远距离比较。
- [x] 为每辆车记录自身最近一次有效前进位置。
- [x] 任意存活车辆有效前进时刷新世代进展时间。
- [x] 验证损毁领先车不再阻塞后方存活车辆。

## 根因

- 旧逻辑记录全种群曾达到的最远位置，包括已经碰撞停止的车辆。
- 后方存活车辆虽然持续前进，但在追上该历史位置前不会刷新进展时间。
- 追赶超过 180 帧时，系统错误地以“连续无前进”结束世代。
- 世代被反复提前截断，使优秀后代没有机会超过 11470.5 的旧成绩。

## 关键设计

- 每辆车使用 `lastProgressY` 保存自身最近一次确认的前进位置。
- 存活车辆相对自身记录向前超过 1 像素，即视为当前世代仍有进展。
- 损毁或因跟车被淘汰的车辆永远不能刷新停滞计时。
- 只有所有存活车辆连续 180 帧都没有产生有效前进，才判定停滞。

## 关键风险

- 只要仍有车辆缓慢向前，世代就会继续运行，但仍受 5000 帧单代上限约束。
- 本次不调整变异强度；修复误判后若仍长期无提升，再考虑自适应变异。

## 当前进展

- 11470.5 不再作为损毁领先车留下的隐性门槛。
- V5 本地存档保持兼容，刷新即可从第 61 代历史最佳结果继续训练。

## 代码变更

- `11. Automated generations/main.js` +18 -10

```diff
 let paused = false;
 let ticksPerFrame = 1;
 let forceFinish = false;
-let bestProgress = 0;
 let lastProgressTick = 0;
@@
     generationTick = 0;
     forceFinish = false;
-    bestProgress = 0;
     lastProgressTick = 0;
@@
             startY: car.y,
+            lastProgressY: car.y,
             aliveTicks: 0,
@@
 function simulateTick() {
     generationTick++;
+    let aliveVehicleProgressed = false;
@@
     for (const car of cars) {
         car.update(road.borders, traffic);
         if (!car.damaged) car.training.aliveTicks++;
+        if (recordAliveProgress(car)) {
+            aliveVehicleProgressed = true;
+        }
@@
-    const currentBestProgress = Math.max(
-        ...cars.map(car => car.training.startY - car.y)
-    );
-    if (currentBestProgress > bestProgress + 1) {
-        bestProgress = currentBestProgress;
+    if (aliveVehicleProgressed) {
         lastProgressTick = generationTick;
     }
@@
+function recordAliveProgress(car) {
+    if (car.damaged) return false;
+
+    // 只检查当前存活车辆自身是否继续前进，不再要求它打破已损毁领先车的历史纪录。
+    if (car.y < car.training.lastProgressY - 1) {
+        car.training.lastProgressY = car.y;
+        return true;
+    }
+    return false;
+}
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段停滞检测只观察存活车辆自身是否继续前进，不使用包含已损毁车辆的全局历史最远距离，避免后续车辆追赶期间被误判停滞。
```

- `.agentdocs/index.md` +2

```diff
+- `workflow/20260809154939-fix-alive-progress-stagnation.md` - 修复历史领先车损毁后误判整个种群停滞；成绩平台或异常提前换代时读取。
+- 停滞计时由任意存活车辆每前进 1 像素刷新，已损毁车辆的历史最远位置不参与停滞判定。
```

## 测试用例

### TC-001 损毁领先车不能刷新进展

- 类型：逻辑测试
- 优先级：高
- 前置条件：车辆已损毁且处于历史最远位置。
- 操作步骤：调用存活进展检测。
- 预期结果：返回 `false`，不刷新停滞计时。
- 是否通过：通过。

### TC-002 后方存活车辆继续前进

- 类型：逻辑测试
- 优先级：高
- 前置条件：存活车辆尚未追上损毁领先车。
- 操作步骤：让存活车辆相对自身记录向前超过 1 像素。
- 预期结果：返回 `true`，刷新停滞计时，不要求打破历史全局纪录。
- 是否通过：通过。

### TC-003 小幅累积前进

- 类型：边界测试
- 优先级：中
- 前置条件：存活车辆每帧前进不足 1 像素。
- 操作步骤：持续前进，直到相对 `lastProgressY` 累计超过 1 像素。
- 预期结果：达到累计阈值时刷新进展位置与计时。
- 是否通过：通过。

