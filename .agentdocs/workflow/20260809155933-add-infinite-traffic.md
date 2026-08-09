# 新增无限交通流训练

## 背景与目标

- 固定 7 辆交通车全部被超过后，前方道路永久为空，神经网络缺少后续避障任务。
- 将第 11 阶段改为循环交通流，使每一代在 5000 帧内持续遇到新的交通车辆。

## 约束与原则

- 保留自动 Generation 管理和单代 5000 帧上限。
- 固定交通车对象数量，通过安全回收避免无限创建 DOM 图片和车辆对象。
- 每次回收必须分配新的交通 ID，使后续超车能再次计分。
- 使用确定性的车道和间距序列，减少不同世代环境随机性对评分可比性的影响。

## 阶段与 TODO

- [x] 将固定 7 辆交通车改为 10 辆循环交通车。
- [x] 定义确定性的车道与纵向间距序列。
- [x] 实现落后交通车回收到最前方。
- [x] 为每次回收分配新的唯一交通 ID。
- [x] 将超车记录由数组索引改为交通 ID。
- [x] 在控制面板显示本代累计生成交通车数量。
- [x] 升级存储版本，隔离有限场景的历史分数。
- [x] 验证持续回收与重复超车计分。

## 关键设计

- 每代初始创建 10 辆交通车。
- 交通车按照固定车道、间距模式分布，模式用完后循环。
- 当交通车落后领先存活 AI 超过 400 像素时，将其移动到当前最前方交通车之前。
- 被回收车辆重置位置、速度、角度、损毁状态和碰撞多边形。
- `trafficId` 每次回收递增，同一物理对象再次被超过时会作为新交通事件计分。

## 关键风险

- 交通流相对领先 AI 生成，落后个体可能看到部分车辆被提前回收，这是以训练最优个体为中心的设计取舍。
- 无限场景与旧有限场景分数不可直接比较，因此使用新的 V6 存储。
- 交通模式是循环的，未来可继续扩展更丰富但可复现的模式。

## 当前进展

- AI 超过初始车辆后，前方会持续补充新的交通车。
- “最佳车超车数”可以超过 7，“本代生成交通车”会随回收持续增加。

## 代码变更

- `11. Automated generations/index.html` +1

```diff
+                <div><dt>本代生成交通车</dt><dd id="trafficGeneratedValue">0</dd></div>
```

- `11. Automated generations/main.js` +77 -13

```diff
     maxTicksPerGeneration: 5000,
     stagnationTicks: 180,
+    trafficCount: 10,
+    trafficRecycleBehindDistance: 400,
@@
-    // V5 使用带滞回的跟车判定，避免距离轻微波动反复清零计时。
-    storageKey: "selfDrivingCarGenerationStateV5"
+    // V6 使用循环生成的无限交通流，旧版有限场景分数不再具有可比性。
+    storageKey: "selfDrivingCarGenerationStateV6"
 });
+
+const TRAFFIC_PATTERN = Object.freeze([
+    { lane: 1, gap: 200 },
+    { lane: 0, gap: 220 },
+    { lane: 2, gap: 180 },
+    { lane: 0, gap: 260 },
+    { lane: 1, gap: 190 },
+    { lane: 2, gap: 240 },
+    { lane: 1, gap: 210 },
+    { lane: 0, gap: 230 },
+    { lane: 2, gap: 200 }
+]);
@@
 let forceFinish = false;
 let lastProgressTick = 0;
+let trafficPatternIndex = 0;
+let nextTrafficId = 1;
@@
     forceFinish = false;
     lastProgressTick = 0;
+    trafficPatternIndex = 0;
+    nextTrafficId = 1;
     traffic = createTraffic();
@@
 function createTraffic() {
-    const positions = [
-        [1, -100],
-        [0, -300], [2, -300],
-        [0, -500], [1, -500],
-        [1, -700], [2, -700]
-    ];
-    return positions.map(([lane, y]) =>
-        new Car(road.getLaneCenter(lane), y, 30, 50, "DUMMY", 2, getRandomColor())
-    );
+    const vehicles = [];
+    let nextY = 100;
+    for (let index = 0; index < CONFIG.trafficCount; index++) {
+        const descriptor = getNextTrafficDescriptor();
+        nextY -= descriptor.gap;
+        const vehicle = new Car(
+            road.getLaneCenter(descriptor.lane),
+            nextY,
+            30,
+            50,
+            "DUMMY",
+            2,
+            getRandomColor()
+        );
+        vehicle.trafficId = nextTrafficId++;
+        vehicles.push(vehicle);
+    }
+    return vehicles;
+}
+
+function getNextTrafficDescriptor() {
+    const descriptor = TRAFFIC_PATTERN[trafficPatternIndex % TRAFFIC_PATTERN.length];
+    trafficPatternIndex++;
+    return descriptor;
 }
@@
-        traffic.forEach((vehicle, index) => {
-            if (car.y < vehicle.y) car.training.overtakenTraffic.add(index);
+        traffic.forEach(vehicle => {
+            if (car.y < vehicle.y) car.training.overtakenTraffic.add(vehicle.trafficId);
         });
@@
     bestCar = cars.reduce((best, car) =>
         car.training.score > best.training.score ? car : best
     );
+    recyclePassedTraffic();
@@
+function recyclePassedTraffic() {
+    const aliveCars = cars.filter(car => !car.damaged);
+    if (aliveCars.length === 0) return;
+
+    const leaderY = Math.min(...aliveCars.map(car => car.y));
+    let frontmostTrafficY = Math.min(
+        ...traffic.map(vehicle => vehicle.y),
+        leaderY - CONFIG.trafficRecycleBehindDistance
+    );
+
+    for (const vehicle of traffic) {
+        if (vehicle.y <= leaderY + CONFIG.trafficRecycleBehindDistance) continue;
+
+        const descriptor = getNextTrafficDescriptor();
+        frontmostTrafficY -= descriptor.gap;
+        vehicle.x = road.getLaneCenter(descriptor.lane);
+        vehicle.y = frontmostTrafficY;
+        vehicle.speed = 0;
+        vehicle.angle = 0;
+        vehicle.damaged = false;
+        vehicle.trafficId = nextTrafficId++;
+        // 立即重建碰撞多边形，避免回收发生在绘制前时使用旧位置。
+        vehicle.update(road.borders, []);
+    }
+}
@@
+    document.getElementById("trafficGeneratedValue").textContent = nextTrafficId - 1;
```

- `AGENTS.md` +1

```diff
+- 第 11 阶段采用无限交通流：10 辆交通车循环复用，落到领先存活 AI 后方 400 像素后会按确定性车道与间距序列回收到最前方，并分配新编号供超车计分。
```

- `.agentdocs/index.md` +3 -1

```diff
+- `workflow/20260809155933-add-infinite-traffic.md` - 将固定 7 辆障碍改为循环回收的无限交通流；维护交通生成或无限训练时读取。
-- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV5`，不会覆盖第 9 阶段的 `bestBrain`；旧版有限场景分数不再加载。
+- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV6`，不会覆盖第 9 阶段的 `bestBrain`；旧版有限场景分数不再加载。
+- 第 11 阶段始终维护 10 辆交通车；落后领先 AI 超过 400 像素的车辆会回收到前方，使用新编号重复参与超车计分。
```

## 测试用例

### TC-001 初始交通流

- 类型：功能测试
- 优先级：高
- 前置条件：新世代开始。
- 操作步骤：检查交通车辆集合。
- 预期结果：存在 10 辆交通车，ID 为 1～10，均位于 AI 前方。
- 是否通过：通过。

### TC-002 落后车辆回收

- 类型：功能测试
- 优先级：高
- 前置条件：交通车落后领先存活 AI 超过 400 像素。
- 操作步骤：执行交通回收。
- 预期结果：车辆移动到最前方、状态重置，并获得新的递增 ID。
- 是否通过：通过。

### TC-003 重复超车计分

- 类型：适应度测试
- 优先级：高
- 前置条件：AI 已超过某个交通车对象，该对象随后被回收。
- 操作步骤：AI 再次超过回收后的同一对象。
- 预期结果：由于交通 ID 已更新，第二次超车作为新事件计分。
- 是否通过：通过。

### TC-004 交通数量稳定

- 类型：性能测试
- 优先级：中
- 前置条件：长时间运行单个世代。
- 操作步骤：执行多次交通回收。
- 预期结果：交通车对象数量始终为 10，不随训练距离增长。
- 是否通过：通过。
