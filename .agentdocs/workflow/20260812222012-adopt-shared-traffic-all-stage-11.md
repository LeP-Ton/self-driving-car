# 第 11 阶段所有子版本接入共享无限交通管理器

## 背景与目标

- 11.3 曾因交通车只参照最靠前测试车回收，导致后方最佳车尚未遇到的障碍被提前移动到前方。
- 共享 `InfiniteTrafficManager` 已在 11.3 验证“最前方补车、最后方回收”规则。
- 将相同防护覆盖到 11.0、11.1 和 11.2，避免这些版本在测试车队伍分散时出现同类问题。

## 约束与原则

- 11.0～11.3 均使用同一个共享管理器，不再保留各目录中的交通创建和回收副本。
- 各版本当前均将所有未碰撞测试车传给管理器，确保任何存活车辆尚需面对的障碍不会被提前回收。
- 不修改各版本的计分、筛选、亲本、镜头、跟车淘汰和浏览器存储规则。
- 保留各版本自身的交通生成模板与配置，管理器通过参数接收。

## 阶段与 TODO

- [x] 11.0 加载并接入共享管理器。
- [x] 11.1 加载并接入共享管理器。
- [x] 11.2 加载并接入共享管理器。
- [x] 删除三个版本的本地交通索引、编号、创建和回收实现。
- [x] 将面板累计交通事件数改读共享管理器统计。
- [x] 更新项目认知和根索引。
- [x] 完成四版本规则、脚本加载、语法、陈旧引用和差异格式检查。

## 关键风险

- 11.1 允许车辆停车且没有长期跟车淘汰；若有存活车辆长期落后，活动交通车数量可能随车队跨度增加。本次优先保证训练公平性，性能上限仍需长时间观察。
- 面板“累计生成交通车”继续显示交通事件次数，而不是实际创建的 JavaScript 对象数量。

## 代码变更

- 11.0、11.1、11.2 的 `index.html`：在各自 `main.js` 前加载共享管理器。

```diff
     <script src="car.js"></script>
+    <script src="../shared/infiniteTrafficManager.js"></script>
     <script src="main.js"></script>
```

- 11.0、11.1、11.2 的 `main.js`：创建阶段专属管理器实例。

```diff
 const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);
+const trafficManager = new InfiniteTrafficManager({
+    minimumAheadCount: CONFIG.trafficCount,
+    recycleBehindDistance: CONFIG.trafficRecycleBehindDistance,
+    trafficPattern: TRAFFIC_PATTERN,
+    getLaneCenter: lane => road.getLaneCenter(lane),
+    createVehicle: (x, y) => new Car(x, y, 30, 50, "DUMMY", 2, getRandomColor())
+});
```

- 三个版本的世代初始化改用共享重置接口。

```diff
-    trafficPatternIndex = 0;
-    nextTrafficId = 1;
-    traffic = createTraffic();
+    traffic = trafficManager.reset(100);
```

- 三个版本的逐帧交通维护改为以全部未碰撞车辆确定覆盖范围。

```diff
-    recyclePassedTraffic();
+    traffic = trafficManager.maintain(cars.filter(car => !car.damaged));
```

- 三个版本的累计交通事件展示改读共享统计。

```diff
-    document.getElementById("trafficGeneratedValue").textContent = nextTrafficId - 1;
+    document.getElementById("trafficGeneratedValue").textContent =
+        trafficManager.getStats().generatedEventCount;
```

- 三个版本整体删除以下本地重复实现。

```diff
-let trafficPatternIndex = 0;
-let nextTrafficId = 1;
-function createTraffic() { /* 本地创建实现 */ }
-function getNextTrafficDescriptor() { /* 本地模板索引实现 */ }
-function recyclePassedTraffic() { /* 仅按领先车提前回收实现 */ }
```

- `AGENTS.md`：记录四个版本已全部接入共享管理器。

```diff
-- `11. Automated generations/shared/infiniteTrafficManager.js` 是第 11 阶段子版本可复用的无限交通生命周期层；当前先由 11.3 接入，统一负责前方补车、最后方回收、对象池复用和交通事件编号，各阶段仍自行决定有效测试车、镜头、排名与超车奖励。
+- `11. Automated generations/shared/infiniteTrafficManager.js` 是第 11 阶段所有子版本共用的无限交通生命周期层；11.0～11.3 均已接入，统一负责前方补车、最后方回收、对象池复用和交通事件编号，各阶段仍自行决定有效测试车、镜头、排名与超车奖励。
```

- `.agentdocs/index.md`：登记全版本接入状态和读取场景。

```diff
 ## 当前变更文档
 
+- `workflow/20260812222012-adopt-shared-traffic-all-stage-11.md` - 将共享无限交通管理器覆盖到 11.0、11.1、11.2，使 11.0～11.3 全部采用最前方补车、最后方回收；排查任一第 11 阶段版本障碍车消失时读取。
@@
-- `11. Automated generations/shared/infiniteTrafficManager.js` 封装前方补车、最后方回收、对象池和交通事件编号；11.3 已接入，其他子版本尚未迁移，接入时必须由阶段传入仍需交通覆盖的有效测试车。
+- `11. Automated generations/shared/infiniteTrafficManager.js` 封装前方补车、最后方回收、对象池和交通事件编号；11.0～11.3 已全部接入，当前各阶段均将未碰撞车辆作为仍需交通覆盖的有效测试车。
```

## 测试用例

### TC-001 四版本共享层加载

- 类型：集成测试
- 优先级：高
- 操作步骤：检查 11.0～11.3 的 HTML 脚本顺序。
- 预期结果：`car.js` 后加载共享管理器，共享管理器后加载 `main.js`。
- 是否通过：通过。

### TC-002 四版本分散车队覆盖

- 类型：规则测试
- 优先级：高
- 前置条件：最前车 `y=-1000`、最后车 `y=0`，两者之间有 10 辆交通车。
- 操作步骤：分别按 11.0～11.3 的接入方式执行交通维护。
- 预期结果：原 10 辆全部保留，最前车前方另补足 10 辆，活动数为 20。
- 是否通过：通过。

### TC-003 陈旧实现清理

- 类型：静态测试
- 优先级：高
- 操作步骤：在四个版本 `main.js` 中检索旧索引、编号、创建和回收函数名称。
- 预期结果：无陈旧引用。
- 是否通过：通过。

### TC-004 JavaScript 语法

- 类型：静态测试
- 优先级：高
- 操作步骤：对四个版本的 `main.js`、`car.js` 及共享管理器执行 `node --check`。
- 预期结果：全部无语法错误。
- 是否通过：通过。

### TC-005 差异格式

- 类型：静态测试
- 优先级：高
- 操作步骤：运行 `git diff --check`。
- 预期结果：无差异格式错误。
- 是否通过：通过。
