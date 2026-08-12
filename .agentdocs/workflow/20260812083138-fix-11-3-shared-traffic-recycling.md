# 修复 11.3 共享交通车被领先车辆提前回收

## 背景与目标

- 11.3 的实时最佳车按“存活、舒适、距离”选择，因此可能落后于真正最靠前的存活测试车。
- 原交通流以最靠前测试车作为唯一回收基准，会把后方最佳车尚未遇到的障碍车提前移动到队首，表现为障碍车从后方画面消失。
- 将交通流改为“最后方回收、最前方补充”，保证任意存活测试车仍可能遇到的障碍车不会被提前挪走。

## 约束与原则

- 不改变 11.3 的舒适度算法、最佳车规则和亲本选择规则。
- 保留对象池复用，避免已经彻底离开车队的交通车对象被反复创建和销毁。
- 领先区域始终至少保持 10 辆交通车；测试车队伍拉长时允许活动交通车数量临时超过 10 辆。
- 只有交通车落到最后方存活测试车后 400 像素，才允许进入对象池。

## 阶段与 TODO

- [x] 将固定交通车数量重新定义为领先区域的最低保障数量。
- [x] 增加跨帧交通车对象池。
- [x] 将回收和前方补充拆分为两个独立判断。
- [x] 复用交通车时重置位置、速度、方向、损毁状态和超车事件 ID。
- [x] 更新项目认知和文档索引。
- [x] 完成 JavaScript 语法、差异格式和规则场景验证。
- [ ] 在可连接浏览器的环境中人工观察长距离分散车队的交通连续性。

## 关键风险

- 当存活测试车前后跨度很大时，活动交通车数量会随覆盖范围增加；这是保证共享交通环境公平性的必要成本。
- 若后续需要限制内存，应通过淘汰严重落后车辆或设置明确的训练有效窗口处理，不能重新按领先车位置提前回收障碍。

## 代码变更

- `11. Automated generations/11.3-comfort-first/main.js`：增加动态活动交通流和对象池。

```diff
-    // 只维护固定数量的交通车对象，通过回收位置形成无限交通流。
+    // 领先区域至少保留 10 辆交通车；车队拉长时允许临时增加，避免后车眼前的障碍被提前回收。
     trafficCount: 10,
+    // 交通车落到最后方存活测试车后 400 像素，才允许进入对象池等待复用。
     trafficRecycleBehindDistance: 400,
@@
 let cars = [];
 let traffic = [];
+// 已彻底离开整个测试车队的交通车进入对象池，后续补充前方车流时优先复用。
+let trafficPool = [];
@@
     trafficPatternIndex = 0;
     nextTrafficId = 1;
+    trafficPool = [];
     traffic = createTraffic();
@@
-        const vehicle = new Car(
-            road.getLaneCenter(descriptor.lane),
-            nextY,
-            30,
-            50,
-            "DUMMY",
-            2,
-            getRandomColor()
-        );
-        vehicle.trafficId = nextTrafficId++;
-        vehicles.push(vehicle);
+        vehicles.push(placeTrafficVehicle(descriptor, nextY));
     }
     return vehicles;
 }
+
+/**
+ * 从对象池取得一辆交通车并放到指定位置；池为空时才创建新对象。
+ * 每次重新进入车流都会分配新 ID，使同一对象的新一轮超车可以独立计数。
+ */
+function placeTrafficVehicle(descriptor, y) {
+    const vehicle = trafficPool.pop() || new Car(
+        road.getLaneCenter(descriptor.lane),
+        y,
+        30,
+        50,
+        "DUMMY",
+        2,
+        getRandomColor()
+    );
+    vehicle.x = road.getLaneCenter(descriptor.lane);
+    vehicle.y = y;
+    vehicle.speed = 0;
+    vehicle.angle = 0;
+    vehicle.damaged = false;
+    vehicle.trafficId = nextTrafficId++;
+    // 临时关闭控制输入再更新，只重建当前位置的多边形，不让车辆在放置过程中额外移动。
+    vehicle.controls.forward = false;
+    vehicle.controls.left = false;
+    vehicle.controls.right = false;
+    vehicle.controls.reverse = false;
+    vehicle.update(road.borders, []);
+    vehicle.controls.forward = true;
+    return vehicle;
+}
@@
- * 更新顺序很重要：先移动交通车，再移动所有 AI，随后评分、回收交通车并判断换代。
+ * 更新顺序很重要：先移动交通车，再移动所有 AI，随后评分、维护交通流并判断换代。
@@
-    recyclePassedTraffic();
+    maintainInfiniteTraffic();
@@
- * 将已经落后领先 AI 的交通车移动到队列最前方。
- * 复用对象可保持内存稳定；分配新 trafficId 可让它再次作为新超车事件计分。
+ * 维护覆盖整个存活测试车队的无限交通流：
+ * 1. 只有落到最后方测试车后方足够远的交通车，才退出活动车流并进入对象池。
+ * 2. 领先区域不足目标数量时，在车流最前方补车，并优先复用对象池中的车辆。
+ *
+ * “最后方回收、最前方补充”刻意使用不同基准，避免领先的非最佳车把后方最佳车
+ * 尚未遇到的障碍提前挪走。测试车队伍跨度较大时，活动交通车数量会暂时超过 10 辆。
  */
-function recyclePassedTraffic() {
+function maintainInfiniteTraffic() {
     const aliveCars = cars.filter(car => !car.damaged);
     if (aliveCars.length === 0) return;
 
-    const leaderY = Math.min(...aliveCars.map(car => car.y));
+    const frontmostCarY = Math.min(...aliveCars.map(car => car.y));
+    const rearmostCarY = Math.max(...aliveCars.map(car => car.y));
+
+    // 先回收已经落到所有存活测试车后方的交通车；仍可能被任一测试车遇到的车必须保留。
+    const activeTraffic = [];
+    for (const vehicle of traffic) {
+        if (vehicle.y > rearmostCarY + CONFIG.trafficRecycleBehindDistance) {
+            trafficPool.push(vehicle);
+        } else {
+            activeTraffic.push(vehicle);
+        }
+    }
+    traffic = activeTraffic;
+
+    // 统计仍覆盖领先区域的车辆；落后领先车超过阈值、但仍服务后车的车辆不计入该数量。
+    let leadingTrafficCount = traffic.filter(vehicle =>
+        vehicle.y <= frontmostCarY + CONFIG.trafficRecycleBehindDistance
+    ).length;
     let frontmostTrafficY = Math.min(
         ...traffic.map(vehicle => vehicle.y),
-        leaderY - CONFIG.trafficRecycleBehindDistance
+        frontmostCarY - CONFIG.trafficRecycleBehindDistance
     );
 
-    for (const vehicle of traffic) {
-        if (vehicle.y <= leaderY + CONFIG.trafficRecycleBehindDistance) continue;
-
+    while (leadingTrafficCount < CONFIG.trafficCount) {
         const descriptor = getNextTrafficDescriptor();
         frontmostTrafficY -= descriptor.gap;
-        vehicle.x = road.getLaneCenter(descriptor.lane);
-        vehicle.y = frontmostTrafficY;
-        vehicle.speed = 0;
-        vehicle.angle = 0;
-        vehicle.damaged = false;
-        vehicle.trafficId = nextTrafficId++;
-        // 立即重建碰撞多边形，避免回收发生在绘制前时使用旧位置。
-        vehicle.update(road.borders, []);
+        traffic.push(placeTrafficVehicle(descriptor, frontmostTrafficY));
+        leadingTrafficCount++;
     }
 }
```

- `AGENTS.md`：补充 11.3 动态交通流项目认知。

```diff
 - `11. Automated generations/11.3-comfort-first` 是乘员舒适优先探索版本：存活车中依次按舒适成本和距离选择，全部碰撞时先按距离选择；舒适成本由纵向加速度、纵向冲击、横向加速度代理和转向突变四项归一化后等权计算。
+- 11.3 的无限交通流采用“最后方回收、最前方补充”：领先区域至少保持 10 辆交通车，只有交通车落到最后方存活测试车后 400 像素才进入对象池；测试车队伍拉长时允许活动交通车临时增加，避免领先的非最佳车提前移走后方车辆尚未遇到的障碍。
```

- `.agentdocs/index.md`：登记本次变更文档和关键交通流规则。

```diff
 ## 当前变更文档
 
+- `workflow/20260812083138-fix-11-3-shared-traffic-recycling.md` - 将 11.3 无限交通改为最后方回收、最前方按需补充，防止领先的非最佳车提前移走后方最佳车仍需面对的障碍；排查障碍车消失或维护动态交通池时读取。
@@
 - `11. Automated generations/11.3-comfort-first/index.html` 是 11.3 舒适优先入口；存活车先比平均舒适成本再比距离，全员碰撞时先比距离，使用 `selfDrivingCarGenerationState11_3ComfortFirstV1` 独立保存训练状态。
+- 11.3 的活动交通车不再固定为 10 辆：领先区域不足 10 辆时向最前方补充，旧交通车只有落到最后方存活测试车后 400 像素才进入对象池；该规则保证分散车队中的后车不会丢失尚未遇到的障碍。
```

## 测试用例

### TC-001 后方测试车仍需要的障碍不回收

- 类型：规则测试
- 优先级：高
- 前置条件：领先测试车与最后方测试车相距超过 400 像素，二者之间存在交通车。
- 操作步骤：执行一次交通流维护。
- 预期结果：位于测试车队伍覆盖范围内的交通车继续保留在活动数组中。
- 是否通过：通过。

### TC-002 领先区域按需补充交通车

- 类型：规则测试
- 优先级：高
- 前置条件：领先区域有效交通车少于 10 辆。
- 操作步骤：执行一次交通流维护。
- 预期结果：在当前车流最前方补充交通车，直到领先区域恢复 10 辆。
- 是否通过：通过。

### TC-003 彻底落后整个车队后才回收

- 类型：规则测试
- 优先级：高
- 前置条件：交通车落到最后方存活测试车后超过 400 像素。
- 操作步骤：执行一次交通流维护。
- 预期结果：交通车退出活动数组并进入对象池；前方补车时优先复用该对象。
- 是否通过：通过。

### TC-004 JavaScript 静态检查

- 类型：静态测试
- 优先级：高
- 操作步骤：运行 `node --check "11. Automated generations/11.3-comfort-first/main.js"` 和 `git diff --check`。
- 预期结果：无语法错误、无差异格式错误。
- 是否通过：通过。

### TC-005 浏览器画面验证

- 类型：功能测试
- 优先级：高
- 操作步骤：打开 11.3，让测试车队伍明显拉开，持续观察后方最佳车前面的障碍车。
- 预期结果：障碍车不会因其他测试车领先而从后方最佳车前方提前消失。
- 是否通过：待验证；当前环境没有可连接的浏览器。
