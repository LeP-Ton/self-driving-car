# 抽取通用无限交通管理器并接入 11.3

## 背景与目标

- 11.3 已验证“最后方回收、最前方补充”可以避免领先测试车提前移走后车仍需面对的障碍。
- 第 11 阶段主版本及 11.1、11.2 存在高度重复的交通创建、回收和编号代码，继续复制会增加规则漂移风险。
- 本次先抽取通用交通生命周期层，并仅让 11.3 接入，以行为不变作为后续迁移的基线。

## 约束与原则

- 通用层只负责交通车创建、前方补充、最后方回收、对象池复用和事件编号。
- 通用层不判断训练车辆是否有效，不接管最佳车、镜头、舒适度、亲本选择或超车奖励。
- 11.3 继续将所有未碰撞测试车作为交通覆盖范围。
- 其他第 11 阶段子版本本次不迁移。

## 阶段与 TODO

- [x] 新增共享目录和 `InfiniteTrafficManager` 类。
- [x] 提供世代重置、逐帧维护、活动车辆和统计接口。
- [x] 从 11.3 删除本地交通池、模板索引、编号及维护函数。
- [x] 调整 11.3 脚本加载顺序并接入共享管理器。
- [x] 更新项目认知和根索引。
- [x] 完成通用层规则测试、语法检查、引用检查和差异格式检查。
- [ ] 稳定运行验证后，再逐个迁移主 11、11.2 和 11.1。

## 关键风险

- 活动交通车数量仍会随有效测试车队伍跨度增长；通用化不等于已解决性能上限问题。
- 不同阶段对“仍需交通覆盖的测试车”定义不同，迁移时必须显式传入，不能在共享层硬编码。
- 共享脚本必须在阶段 `main.js` 之前加载。

## 代码变更

- `11. Automated generations/shared/infiniteTrafficManager.js`：新增通用交通生命周期管理器。

```diff
+/**
+ * InfiniteTrafficManager（无限交通管理器）统一管理第 11 阶段的交通车生命周期。
+ *
+ * 职责边界：
+ * 1. 在最靠前有效测试车前方维持指定数量的交通车。
+ * 2. 只有交通车落到最后方有效测试车之后，才回收到对象池。
+ * 3. 复用对象时重置运动状态，并为新一轮超车事件分配唯一 ID。
+ *
+ * 管理器不判断哪些测试车“有效”，也不负责镜头、训练排名或超车奖励；
+ * 调用方应把符合本阶段规则的车辆传给 maintain()。
+ */
+class InfiniteTrafficManager {
+    constructor({
+        minimumAheadCount,
+        recycleBehindDistance,
+        trafficPattern,
+        createVehicle,
+        getLaneCenter
+    }) {
+        if (!Array.isArray(trafficPattern) || trafficPattern.length === 0) {
+            throw new Error("无限交通管理器需要至少一个交通生成模板。");
+        }
+
+        this.minimumAheadCount = minimumAheadCount;
+        this.recycleBehindDistance = recycleBehindDistance;
+        this.trafficPattern = trafficPattern;
+        this.createVehicle = createVehicle;
+        this.getLaneCenter = getLaneCenter;
+        this.vehicles = [];
+        this.pool = [];
+        this.patternIndex = 0;
+        this.nextTrafficId = 1;
+    }
+
+    reset(startY) {
+        this.vehicles = [];
+        this.pool = [];
+        this.patternIndex = 0;
+        this.nextTrafficId = 1;
+        let nextY = startY;
+        for (let index = 0; index < this.minimumAheadCount; index++) {
+            const descriptor = this.#getNextDescriptor();
+            nextY -= descriptor.gap;
+            this.vehicles.push(this.#placeVehicle(descriptor, nextY));
+        }
+        return this.vehicles;
+    }
+
+    maintain(relevantCars) {
+        if (relevantCars.length === 0) return this.vehicles;
+        const frontmostCarY = Math.min(...relevantCars.map(car => car.y));
+        const rearmostCarY = Math.max(...relevantCars.map(car => car.y));
+        const activeVehicles = [];
+        for (const vehicle of this.vehicles) {
+            if (vehicle.y > rearmostCarY + this.recycleBehindDistance) {
+                this.pool.push(vehicle);
+            } else {
+                activeVehicles.push(vehicle);
+            }
+        }
+        this.vehicles = activeVehicles;
+        let trafficAheadCount = this.vehicles.filter(vehicle =>
+            vehicle.y < frontmostCarY
+        ).length;
+        let frontmostTrafficY = Math.min(
+            ...this.vehicles.map(vehicle => vehicle.y),
+            frontmostCarY - this.recycleBehindDistance
+        );
+        while (trafficAheadCount < this.minimumAheadCount) {
+            const descriptor = this.#getNextDescriptor();
+            frontmostTrafficY -= descriptor.gap;
+            this.vehicles.push(this.#placeVehicle(descriptor, frontmostTrafficY));
+            trafficAheadCount++;
+        }
+        return this.vehicles;
+    }
+
+    getVehicles() {
+        return this.vehicles;
+    }
+
+    getStats() {
+        return {
+            activeCount: this.vehicles.length,
+            pooledCount: this.pool.length,
+            generatedEventCount: this.nextTrafficId - 1
+        };
+    }
+
+    #getNextDescriptor() {
+        const descriptor = this.trafficPattern[
+            this.patternIndex % this.trafficPattern.length
+        ];
+        this.patternIndex++;
+        return descriptor;
+    }
+
+    #placeVehicle(descriptor, y) {
+        const x = this.getLaneCenter(descriptor.lane);
+        const vehicle = this.pool.pop() || this.createVehicle(x, y);
+        vehicle.x = x;
+        vehicle.y = y;
+        vehicle.speed = 0;
+        vehicle.angle = 0;
+        vehicle.damaged = false;
+        vehicle.trafficId = this.nextTrafficId++;
+        vehicle.controls.forward = false;
+        vehicle.controls.left = false;
+        vehicle.controls.right = false;
+        vehicle.controls.reverse = false;
+        vehicle.update([], []);
+        vehicle.controls.forward = true;
+        return vehicle;
+    }
+}
```

- `11. Automated generations/11.3-comfort-first/index.html`：在 `main.js` 前加载共享管理器。

```diff
     <script src="../../9. Fine-tuning/controls.js"></script>
     <script src="car.js"></script>
+    <!-- 第 11 阶段子版本共用的无限交通生命周期管理层。 -->
+    <script src="../shared/infiniteTrafficManager.js"></script>
     <script src="main.js"></script>
```

- `11. Automated generations/11.3-comfort-first/main.js`：实例化并调用管理器，删除本地重复实现。

```diff
 const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);
+// 交通管理器只接管对象生命周期；哪些测试车参与覆盖范围仍由本阶段决定。
+const trafficManager = new InfiniteTrafficManager({
+    minimumAheadCount: CONFIG.trafficCount,
+    recycleBehindDistance: CONFIG.trafficRecycleBehindDistance,
+    trafficPattern: TRAFFIC_PATTERN,
+    getLaneCenter: lane => road.getLaneCenter(lane),
+    createVehicle: (x, y) => new Car(x, y, 30, 50, "DUMMY", 2, getRandomColor())
+});
@@
-    trafficPatternIndex = 0;
-    nextTrafficId = 1;
-    trafficPool = [];
-    traffic = createTraffic();
+    traffic = trafficManager.reset(100);
@@
-    maintainInfiniteTraffic();
+    // 11.3 将所有未碰撞车辆视为仍需交通覆盖的有效车辆。
+    traffic = trafficManager.maintain(cars.filter(car => !car.damaged));
@@
-    document.getElementById("trafficGeneratedValue").textContent = nextTrafficId - 1;
+    document.getElementById("trafficGeneratedValue").textContent =
+        trafficManager.getStats().generatedEventCount;
```

以下本地重复实现已整体删除：`trafficPool`、`trafficPatternIndex`、`nextTrafficId`、`createTraffic()`、`placeTrafficVehicle()`、`getNextTrafficDescriptor()` 和 `maintainInfiniteTraffic()`。

- `AGENTS.md`：补充共享交通管理层的职责边界和当前接入状态。

```diff
 - 11.3 的无限交通流采用“最后方回收、最前方补充”：最靠前存活测试车的前方严格保持至少 10 辆交通车，只有交通车落到最后方存活测试车后 400 像素才进入对象池；测试车队伍拉长时允许活动交通车临时增加，避免领先的非最佳车提前移走后方车辆尚未遇到的障碍。
+- `11. Automated generations/shared/infiniteTrafficManager.js` 是第 11 阶段子版本可复用的无限交通生命周期层；当前先由 11.3 接入，统一负责前方补车、最后方回收、对象池复用和交通事件编号，各阶段仍自行决定有效测试车、镜头、排名与超车奖励。
```

- `.agentdocs/index.md`：登记本次文档和共享层关键记忆。

```diff
 ## 当前变更文档
 
+- `workflow/20260812214010-extract-shared-infinite-traffic-manager.md` - 抽取第 11 阶段通用无限交通管理器并让 11.3 首次接入，保持最后方回收与前方补足行为不变；迁移其他子版本或维护交通生命周期时读取。
@@
 - `11. Automated generations/11.3-comfort-first/index.html` 是 11.3 舒适优先入口；存活车先比平均舒适成本再比距离，全员碰撞时先比距离，使用 `selfDrivingCarGenerationState11_3ComfortFirstV1` 独立保存训练状态。
+- `11. Automated generations/shared/infiniteTrafficManager.js` 封装前方补车、最后方回收、对象池和交通事件编号；11.3 已接入，其他子版本尚未迁移，接入时必须由阶段传入仍需交通覆盖的有效测试车。
```

## 测试用例

### TC-001 新世代初始化

- 类型：规则测试
- 优先级：高
- 操作步骤：调用 `reset(100)`。
- 预期结果：前方创建 10 辆交通车，活动数 10、对象池 0、累计事件数 10。
- 是否通过：通过。

### TC-002 分散车队交通覆盖

- 类型：规则测试
- 优先级：高
- 前置条件：最前测试车 `y=-1000`、最后测试车 `y=0`，两者之间有 10 辆交通车。
- 操作步骤：调用 `maintain()`。
- 预期结果：原有 10 辆全部保留，并在最前测试车前方补足 10 辆。
- 是否通过：通过。

### TC-003 对象池复用

- 类型：规则测试
- 优先级：高
- 前置条件：交通车落在最后测试车后方超过 400 像素。
- 操作步骤：调用 `maintain()`。
- 预期结果：该对象先进入对象池，再被复用到车流前方，并取得新的 `trafficId`。
- 是否通过：通过。

### TC-004 空有效车集合

- 类型：规则测试
- 优先级：中
- 操作步骤：调用 `maintain([])`。
- 预期结果：保持当前活动数组和状态不变，不异常补车或回收。
- 是否通过：通过。

### TC-005 静态与集成检查

- 类型：静态测试
- 优先级：高
- 操作步骤：分别对共享管理器和 11.3 `main.js` 执行 `node --check`，检索已删除的旧引用，并运行 `git diff --check`。
- 预期结果：无语法错误、无陈旧引用、无差异格式错误。
- 是否通过：通过。
