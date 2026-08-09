# 删除跟车淘汰机制

## 背景与目标

- 第 11 阶段原先会检测连续跟车，并在累计 300 帧后将测试车硬淘汰。
- 删除该机制，使亲本筛选只把碰撞作为硬淘汰状态，不再干预长期跟车行为。

## 约束与原则

- 完整删除已无用途的跟车阈值、会话状态、检测函数和统计展示。
- 保留超车统计，因为它仍用于观察训练表现，但不参与亲本筛选。
- 保留历史变更文档及索引条目，确保旧会话可以回溯；以当前关键记忆说明最新规则。

## 阶段与 TODO

- [x] 删除跟车检测固定参数。
- [x] 删除车辆跟车训练状态和单帧检测调用。
- [x] 删除跟车检测与淘汰函数。
- [x] 删除面板跟车统计及更新逻辑。
- [x] 更新源码注释、项目认知和文档索引。
- [x] 完成 JavaScript 语法、残留引用和 diff 格式检查。

## 关键风险

- 车辆可以长期跟随交通车且保持存活；如果仍在缓慢前进，停滞检测不会结束该世代。
- 存活优先规则下，长期跟车但未碰撞的车辆可能优于前进更远但已碰撞的车辆。

## 当前进展

- 跟车不再被检测、计时或淘汰。
- 测试车只有撞道路或交通车时才会进入硬淘汰状态。
- 亲本排序仍为“存活优先、距离第二”，超车数仍仅用于展示。

## 代码变更

- `11. Automated generations/main.js`：删除跟车配置、状态、调用、检测函数和统计更新，并修正文档注释。

```diff
-    // 跟车检测采用进入/退出两个距离阈值，避免在边界附近反复开始和结束计时。
-    followingEnterDistance: 170,
-    followingExitDistance: 220,
-    // 连续 60 帧未检测到跟车，才真正结束本次跟车会话。
-    followingReleaseTicks: 60,
-    // 累计命中 300 个跟车帧后淘汰车辆，不替神经网络强制选择转向。
-    followingEliminationTicks: 300,
@@
-            // 跟车状态只负责触发硬淘汰，超车集合只用于面板统计。
-            consecutiveFollowingTicks: 0,
-            missedFollowingTicks: 0,
-            longestFollowingTicks: 0,
-            eliminatedForFollowing: false,
+            // 超车集合仅用于面板统计，不参与距离筛选。
             overtakenTraffic: new Set(),
@@
-        updateFollowingState(car);
-
@@
-// ==================== 无限交通、进展与跟车规则 ====================
+// ==================== 无限交通与进展规则 ====================
@@
-/**
- * 更新跟车会话。
- * 进入阈值较小、退出阈值较大，并允许短暂丢失目标，称为“滞回检测”。
- * 跟车过程不逐帧扣分；累计命中 300 帧时直接淘汰。
- */
-function updateFollowingState(car) {
-    if (car.damaged) {
-        car.training.consecutiveFollowingTicks = 0;
-        car.training.missedFollowingTicks = 0;
-        return;
-    }
-
-    const followingSessionActive = car.training.consecutiveFollowingTicks > 0;
-    const distanceThreshold = followingSessionActive
-        ? CONFIG.followingExitDistance
-        : CONFIG.followingEnterDistance;
-    const lateralThresholdScale = followingSessionActive ? 1 : 0.75;
-    const isFollowing = traffic.some(vehicle => {
-        const forwardGap = car.y - vehicle.y;
-        const sameLaneThreshold = (car.width + vehicle.width) * lateralThresholdScale;
-        return forwardGap > 0
-            && forwardGap <= distanceThreshold
-            && Math.abs(car.x - vehicle.x) < sameLaneThreshold;
-    });
-
-    if (isFollowing) {
-        car.training.consecutiveFollowingTicks++;
-        car.training.missedFollowingTicks = 0;
-        car.training.longestFollowingTicks = Math.max(
-            car.training.longestFollowingTicks,
-            car.training.consecutiveFollowingTicks
-        );
-        if (car.training.consecutiveFollowingTicks >= CONFIG.followingEliminationTicks) {
-            // 不替神经网络选择转向方向；直接停止该个体，避免不安全的强制转向干扰训练。
-            car.training.eliminatedForFollowing = true;
-            car.damaged = true;
-        }
-    } else {
-        car.training.missedFollowingTicks++;
-        // 必须持续脱离一段时间才结束本次跟车，过滤车距和横向位置的短暂抖动。
-        if (car.training.missedFollowingTicks >= CONFIG.followingReleaseTicks) {
-            car.training.consecutiveFollowingTicks = 0;
-            car.training.missedFollowingTicks = 0;
-        }
-    }
-}
-
@@
- * 碰撞和长期跟车通过 damaged 作为硬淘汰条件，不再换算成人工分数。
+ * 碰撞通过 damaged 作为硬淘汰条件，不再换算成人工分数。
@@
-    document.getElementById("followingValue").textContent = `${bestCar?.training.longestFollowingTicks || 0} 帧`;
-    document.getElementById("followingEliminatedValue").textContent = cars.filter(
-        car => car.training.eliminatedForFollowing
-    ).length;
```

- `11. Automated generations/index.html` -2

```diff
-                <div><dt>最长连续跟车</dt><dd id="followingValue">0 帧</dd></div>
-                <div><dt>本代跟车淘汰</dt><dd id="followingEliminatedValue">0</dd></div>
```

- `AGENTS.md` +3 -4

```diff
-- 第 11 阶段连续跟车达到 300 帧时直接淘汰该个体，不换算为扣分；不采用强制转向，以免绕过神经网络或转入有车的相邻车道。
-- 第 11 阶段跟车检测使用滞回：170 像素内进入、220 像素外才可能退出，并要求连续脱离 60 帧才重置跟车会话，避免轻微距离或横向波动规避淘汰。
+- 第 11 阶段不检测或淘汰长期跟车个体；车辆只有撞道路或交通车时才会硬淘汰，亲本选择保持“存活优先、距离第二”。
@@
-- 第 11 阶段撞道路、撞交通车和长期跟车均属于硬淘汰；如果全员淘汰，仍从中选择前进距离最远者作为亲本。
-- `11. Automated generations/main.js` 已按固定配置、世代初始化、单帧模拟、交通与跟车、适应度与遗传、动画绘制、面板持久化分区，并用中文注释说明完整规则。
+- 第 11 阶段撞道路和撞交通车属于硬淘汰；如果全员淘汰，仍从中选择前进距离最远者作为亲本。
+- `11. Automated generations/main.js` 已按固定配置、世代初始化、单帧模拟、无限交通与进展、适应度与遗传、动画绘制、面板持久化分区，并用中文注释说明完整规则。
```

- `.agentdocs/index.md` +2 -2

```diff
+- `workflow/20260809205627-remove-following-elimination.md` - 删除长期跟车检测、淘汰及面板统计，车辆仅因碰撞硬淘汰；维护当前筛选和淘汰规则时读取。
@@
-- 第 11 阶段连续跟车达到 300 帧会直接淘汰车辆，不扣分，也不强制替神经网络执行转向。
-- 跟车检测以 170 像素进入、220 像素退出形成滞回，且需连续脱离 60 帧才清零，避免跟车车辆利用阈值抖动逃避淘汰。
+- 第 11 阶段已移除跟车检测与跟车淘汰；车辆只有碰撞道路或交通车时才会硬淘汰。
```

## 测试用例

### TC-001 长期跟车不淘汰

- 类型：功能测试
- 优先级：高
- 前置条件：测试车持续跟随同车道交通车且未发生碰撞。
- 操作步骤：运行超过原淘汰阈值 300 个模拟帧。
- 预期结果：测试车不会因跟车被标记为损毁，仍继续参与训练。
- 是否通过：静态检查通过，浏览器行为待验证。

### TC-002 碰撞仍然淘汰

- 类型：回归测试
- 优先级：高
- 操作步骤：观察测试车撞击道路边界或交通车。
- 预期结果：碰撞车正常标记为损毁，并在亲本排序中落后于所有存活车辆。
- 是否通过：静态检查通过，浏览器行为待验证。

### TC-003 面板清理

- 类型：界面测试
- 优先级：中
- 操作步骤：打开第 11 阶段页面并观察统计面板。
- 预期结果：不再显示“最长连续跟车”和“本代跟车淘汰”，其余统计正常更新。
- 是否通过：静态检查通过，浏览器行为待验证。
