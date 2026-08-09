# 修复跟车检测阈值抖动

## 背景与目标

- 部分车辆视觉上持续跟车，却没有在 300 帧后被淘汰。
- 修复严格阈值导致计时器反复清零的问题，使跟车会话能容忍正常的车距与横向抖动。

## 约束与原则

- 不把一次短暂接近误判为长期跟车。
- 进入跟车和退出跟车使用不同阈值，形成 hysteresis（滞回）。
- 短暂丢失跟车条件不能立即清空已有计时。

## 阶段与 TODO

- [x] 检查跟车判定和淘汰路径。
- [x] 定位距离或横向条件单帧失效会立即清零的问题。
- [x] 实现进入、退出距离滞回。
- [x] 实现连续脱离 60 帧后才释放跟车会话。
- [x] 升级训练存储版本。
- [x] 验证边界抖动、短暂脱离、真正脱离和最终淘汰。

## 根因

- 旧逻辑只有一个 150 像素距离阈值。
- 车距在 149 与 151 像素之间波动时，`consecutiveFollowingTicks` 会不断从零开始。
- 车辆轻微横移超过 45 像素也会产生同样结果。
- 因此视觉上长期跟车不等于程序连续命中 300 次。

## 关键设计

- 未处于跟车会话时，前车进入 170 像素才开始计时。
- 已处于跟车会话时，距离阈值放宽到 220 像素，横向阈值由 45 放宽到 60 像素。
- 暂时未检测到前车时保留已有跟车帧数。
- 只有连续 60 帧未检测到跟车，才真正结束会话并清零。
- 跟车命中累计达到 300 帧时仍按原规则淘汰。

## 关键风险

- 滞回会让刚完成变道的车辆最多再保持 60 帧旧会话状态，但脱离期间不会继续增加跟车计数。
- 阈值仍是针对当前三车道直路的启发式参数。

## 当前进展

- 跟车车辆不能再通过围绕单一阈值轻微波动来规避淘汰。
- 真正离开前车或完成变道超过 60 帧后，跟车会话会正常重置。

## 代码变更

- `11. Automated generations/main.js` +24 -7

```diff
-    followingDistance: 150,
+    followingEnterDistance: 170,
+    followingExitDistance: 220,
+    followingReleaseTicks: 60,
     followingGraceTicks: 180,
     followingEliminationTicks: 300,
-    // V4 增加持续跟车淘汰，避免加载旧规则下保留的跟车大脑。
-    storageKey: "selfDrivingCarGenerationStateV4"
+    // V5 使用带滞回的跟车判定，避免距离轻微波动反复清零计时。
+    storageKey: "selfDrivingCarGenerationStateV5"
@@
             followingTicks: 0,
             consecutiveFollowingTicks: 0,
+            missedFollowingTicks: 0,
             longestFollowingTicks: 0,
@@
     if (car.damaged) {
         car.training.consecutiveFollowingTicks = 0;
+        car.training.missedFollowingTicks = 0;
         return;
     }
 
+    const followingSessionActive = car.training.consecutiveFollowingTicks > 0;
+    const distanceThreshold = followingSessionActive
+        ? CONFIG.followingExitDistance
+        : CONFIG.followingEnterDistance;
+    const lateralThresholdScale = followingSessionActive ? 1 : 0.75;
     const isFollowing = traffic.some(vehicle => {
         const forwardGap = car.y - vehicle.y;
-        const sameLaneThreshold = (car.width + vehicle.width) * 0.75;
+        const sameLaneThreshold = (car.width + vehicle.width) * lateralThresholdScale;
         return forwardGap > 0
-            && forwardGap <= CONFIG.followingDistance
+            && forwardGap <= distanceThreshold
             && Math.abs(car.x - vehicle.x) < sameLaneThreshold;
     });
@@
         car.training.followingTicks++;
         car.training.consecutiveFollowingTicks++;
+        car.training.missedFollowingTicks = 0;
@@
     } else {
-        car.training.consecutiveFollowingTicks = 0;
+        car.training.missedFollowingTicks++;
+        // 必须持续脱离一段时间才结束本次跟车，过滤车距和横向位置的短暂抖动。
+        if (car.training.missedFollowingTicks >= CONFIG.followingReleaseTicks) {
+            car.training.consecutiveFollowingTicks = 0;
+            car.training.missedFollowingTicks = 0;
+        }
     }
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段跟车检测使用滞回：170 像素内进入、220 像素外才可能退出，并要求连续脱离 60 帧才重置跟车会话，避免轻微距离或横向波动规避淘汰。
```

- `.agentdocs/index.md` +3 -1

```diff
+- `workflow/20260809153912-fix-following-detection-hysteresis.md` - 修复跟车计时被距离波动反复清零，加入滞回与延迟释放；排查未触发淘汰时读取。
-- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV4`，不会覆盖第 9 阶段的 `bestBrain`；旧版适应度训练数据不再加载。
+- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV5`，不会覆盖第 9 阶段的 `bestBrain`；旧版适应度训练数据不再加载。
+- 跟车检测以 170 像素进入、220 像素退出形成滞回，且需连续脱离 60 帧才清零，避免跟车车辆利用阈值抖动逃避淘汰。
```

## 测试用例

### TC-001 距离阈值抖动

- 类型：边界测试
- 优先级：高
- 前置条件：车辆已进入跟车会话。
- 操作步骤：让前后距离在 160～210 像素之间反复变化。
- 预期结果：跟车会话保持，命中帧数继续累计。
- 是否通过：通过。

### TC-002 短暂脱离不清零

- 类型：边界测试
- 优先级：高
- 前置条件：已有跟车累计帧数。
- 操作步骤：连续 59 帧不满足跟车条件。
- 预期结果：已有跟车累计不清零。
- 是否通过：通过。

### TC-003 持续脱离后释放

- 类型：边界测试
- 优先级：高
- 前置条件：已有跟车累计帧数。
- 操作步骤：连续 60 帧不满足跟车条件。
- 预期结果：跟车会话结束，连续跟车累计清零。
- 是否通过：通过。

### TC-004 间歇抖动仍会淘汰

- 类型：功能测试
- 优先级：高
- 前置条件：车辆长期跟车，期间存在少于 60 帧的短暂脱离。
- 操作步骤：累计产生 300 个跟车命中帧。
- 预期结果：车辆仍在第 300 个命中帧被淘汰。
- 是否通过：通过。

