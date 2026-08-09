# 新增第 11 阶段自动世代训练

## 背景与目标

- 在第 9 阶段的神经网络与驾驶环境基础上，新增完整、无需人工刷新或保存的 Generation（世代）管理。
- 保留第 9 阶段不变，使第 11 阶段作为独立实验入口。
- 让训练过程具备明确的世代边界、适应度、选择、交叉、变异、精英保留、统计和持久化能力。

## 约束与原则

- 不引入包管理器、构建工具或测试框架。
- 复用第 9 阶段稳定的几何、道路、传感器、神经网络和可视化实现。
- 世代管理与车辆驾驶模型分离，训练元数据挂载在独立的 `training` 字段。
- 使用独立的本地存储键，避免覆盖第 9 阶段的 `bestBrain`。

## 阶段与 TODO

- [x] 新增第 11 阶段独立页面和训练状态面板。
- [x] 实现固定种群规模与自动世代结束条件。
- [x] 实现综合适应度计算。
- [x] 实现精英保留、锦标赛选择、双亲交叉和随机变异。
- [x] 实现代数、历史最佳大脑和最近成绩的持久化。
- [x] 实现暂停、提前结算、速度切换和清空训练。
- [x] 更新项目认知与根索引。
- [ ] 在浏览器中进行长时间训练效果验证。

## 关键设计

- 种群数量：100。
- 单代上限：5000 个模拟帧；全部车辆损毁时也会提前结束。
- 适应度：前进距离 + 存活奖励 + 超车奖励 - 碰撞惩罚。
- 精英保留：前 5 名不变异进入下一代。
- 亲本池：本代前 10 名。
- 亲本选择：三候选锦标赛选择。
- 交叉：每个权重与偏置随机继承父本或母本。
- 变异：交叉后的后代使用 0.1 强度线性随机变异。
- 持久化：每代结束自动保存代数、历史最高大脑和最近 30 代成绩。

## 关键风险

- 当前适应度权重是启发式参数，需要通过多轮运行继续观察是否产生目标驾驶行为。
- 浏览器刷新不能恢复“正在运行到一半”的个体状态，只会从已保存的历史最佳大脑开始新一代。
- 第 11 阶段复用第 9 阶段的文本脚本和车辆图片，因此移动单独目录会破坏相对资源路径。
- 高倍速会增加单个动画帧的计算量，性能较弱的设备可能出现画面卡顿。

## 当前进展

- 自动世代生命周期已经实现。
- 页面可实时显示代数、存活数、进度、本代最高分、历史最高分和变异强度。
- 每代结束后无需人工操作即可生成并运行下一代。

## 代码变更

- `11. Automated generations/index.html`（新增）

```diff
+<!DOCTYPE html>
+<html lang="zh-CN">
+<head>
+    <meta charset="utf-8">
+    <meta name="viewport" content="width=device-width, initial-scale=1">
+    <title>自动驾驶汽车 - 自动世代训练</title>
+    <link rel="stylesheet" href="style.css">
+</head>
+<body>
+    <main class="simulation">
+        <canvas id="carCanvas"></canvas>
+        <aside class="control-panel">
+            <h1>自动世代训练</h1>
+            <dl class="stats">
+                <div><dt>当前世代</dt><dd id="generationValue">1</dd></div>
+                <div><dt>存活车辆</dt><dd id="aliveValue">0 / 100</dd></div>
+                <div><dt>世代进度</dt><dd id="progressValue">0%</dd></div>
+                <div><dt>本代最高分</dt><dd id="currentScoreValue">0</dd></div>
+                <div><dt>历史最高分</dt><dd id="bestScoreValue">0</dd></div>
+                <div><dt>变异强度</dt><dd id="mutationValue">0.10</dd></div>
+            </dl>
+            <div class="buttons">
+                <button id="pauseButton" type="button" onclick="togglePause()">暂停</button>
+                <button type="button" onclick="finishGenerationEarly()">提前结束本代</button>
+                <button class="danger" type="button" onclick="resetTraining()">清空训练</button>
+            </div>
+            <label class="speed-control">
+                模拟速度
+                <select id="speedSelect" onchange="setSimulationSpeed(this.value)">
+                    <option value="1">1×</option>
+                    <option value="5">5×</option>
+                    <option value="20">20×</option>
+                </select>
+            </label>
+            <p id="statusText" class="status">正在初始化第一代……</p>
+            <p class="hint">每代会自动评估、选择、交叉和变异，无需刷新页面或手动保存。</p>
+        </aside>
+        <canvas id="networkCanvas"></canvas>
+    </main>
+
+    <!-- 复用第 9 阶段稳定的几何、传感器和神经网络实现。 -->
+    <script src="../9. Fine-tuning/visualizer.js"></script>
+    <script src="../9. Fine-tuning/network.js"></script>
+    <script src="../9. Fine-tuning/sensor.js"></script>
+    <script src="../9. Fine-tuning/utils.js"></script>
+    <script src="../9. Fine-tuning/road.js"></script>
+    <script src="../9. Fine-tuning/controls.js"></script>
+    <script src="car.js"></script>
+    <script src="main.js"></script>
+</body>
+</html>
+
+
```

- `11. Automated generations/style.css`（新增）

```diff
+:root {
+    color-scheme: dark;
+    font-family: "Microsoft YaHei", system-ui, sans-serif;
+}
+
+* {
+    box-sizing: border-box;
+}
+
+body {
+    margin: 0;
+    overflow: hidden;
+    background: #181a1f;
+    color: #f4f4f5;
+}
+
+.simulation {
+    display: flex;
+    justify-content: center;
+    align-items: stretch;
+    height: 100vh;
+}
+
+#carCanvas {
+    width: 240px;
+    background: #b7b7b7;
+}
+
+#networkCanvas {
+    width: 360px;
+    background: #090a0c;
+}
+
+.control-panel {
+    width: 300px;
+    padding: 22px;
+    overflow-y: auto;
+    background: #24272e;
+    border-inline: 1px solid #363a44;
+}
+
+h1 {
+    margin: 0 0 20px;
+    font-size: 22px;
+}
+
+.stats {
+    margin: 0;
+}
+
+.stats div {
+    display: flex;
+    justify-content: space-between;
+    gap: 16px;
+    padding: 9px 0;
+    border-bottom: 1px solid #3a3e48;
+}
+
+.stats dt {
+    color: #aeb4c0;
+}
+
+.stats dd {
+    margin: 0;
+    font-variant-numeric: tabular-nums;
+}
+
+.buttons {
+    display: grid;
+    gap: 8px;
+    margin-top: 20px;
+}
+
+button,
+select {
+    border: 1px solid #505665;
+    border-radius: 6px;
+    padding: 9px 12px;
+    background: #343945;
+    color: inherit;
+    cursor: pointer;
+}
+
+button:hover,
+select:hover {
+    background: #414754;
+}
+
+button.danger {
+    border-color: #974545;
+    background: #612e32;
+}
+
+.speed-control {
+    display: flex;
+    justify-content: space-between;
+    align-items: center;
+    margin-top: 18px;
+    color: #c5cad3;
+}
+
+.status {
+    min-height: 44px;
+    margin: 20px 0 0;
+    color: #7dd3fc;
+}
+
+.hint {
+    color: #969daa;
+    font-size: 13px;
+    line-height: 1.6;
+}
+
+@media (max-width: 850px) {
+    #networkCanvas {
+        display: none;
+    }
+}
+
+
```

- `11. Automated generations/car.js`（新增）

```diff
+class Car {
+    constructor(x, y, width, height, controlType, maxSpeed = 3, color = "blue") {
+        this.x = x;
+        this.y = y;
+        this.width = width;
+        this.height = height;
+
+        this.speed = 0;
+        this.acceleration = 0.2;
+        this.maxSpeed = maxSpeed;
+        this.friction = 0.05;
+        this.angle = 0;
+        this.damaged = false;
+        this.useBrain = controlType === "AI";
+
+        if (controlType !== "DUMMY") {
+            this.sensor = new Sensor(this);
+            this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
+        }
+        this.controls = new Controls(controlType);
+
+        this.img = new Image();
+        // 图片仍由第 9 阶段提供，避免为了世代管理复制无关的二进制资源。
+        this.img.src = "../9. Fine-tuning/car.png";
+        this.mask = document.createElement("canvas");
+        this.mask.width = width;
+        this.mask.height = height;
+
+        const maskCtx = this.mask.getContext("2d");
+        this.img.onload = () => {
+            maskCtx.fillStyle = color;
+            maskCtx.fillRect(0, 0, this.width, this.height);
+            maskCtx.globalCompositeOperation = "destination-atop";
+            maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
+        };
+    }
+
+    update(roadBorders, traffic) {
+        if (!this.damaged) {
+            this.#move();
+            this.polygon = this.#createPolygon();
+            this.damaged = this.#assessDamage(roadBorders, traffic);
+        }
+
+        if (this.sensor) {
+            this.sensor.update(roadBorders, traffic);
+            const offsets = this.sensor.readings.map(
+                reading => reading == null ? 0 : 1 - reading.offset
+            );
+            const outputs = NeuralNetwork.feedForward(offsets, this.brain);
+            if (this.useBrain) {
+                this.controls.forward = outputs[0];
+                this.controls.left = outputs[1];
+                this.controls.right = outputs[2];
+                this.controls.reverse = outputs[3];
+            }
+        }
+    }
+
+    #assessDamage(roadBorders, traffic) {
+        for (const border of roadBorders) {
+            if (polysIntersect(this.polygon, border)) {
+                return true;
+            }
+        }
+        for (const vehicle of traffic) {
+            if (polysIntersect(this.polygon, vehicle.polygon)) {
+                return true;
+            }
+        }
+        return false;
+    }
+
+    #createPolygon() {
+        const radius = Math.hypot(this.width, this.height) / 2;
+        const alpha = Math.atan2(this.width, this.height);
+        return [
+            {
+                x: this.x - Math.sin(this.angle - alpha) * radius,
+                y: this.y - Math.cos(this.angle - alpha) * radius
+            },
+            {
+                x: this.x - Math.sin(this.angle + alpha) * radius,
+                y: this.y - Math.cos(this.angle + alpha) * radius
+            },
+            {
+                x: this.x - Math.sin(Math.PI + this.angle - alpha) * radius,
+                y: this.y - Math.cos(Math.PI + this.angle - alpha) * radius
+            },
+            {
+                x: this.x - Math.sin(Math.PI + this.angle + alpha) * radius,
+                y: this.y - Math.cos(Math.PI + this.angle + alpha) * radius
+            }
+        ];
+    }
+
+    #move() {
+        if (this.controls.forward) this.speed += this.acceleration;
+        if (this.controls.reverse) this.speed -= this.acceleration;
+
+        this.speed = Math.min(this.speed, this.maxSpeed);
+        this.speed = Math.max(this.speed, -this.maxSpeed / 2);
+
+        if (this.speed > 0) this.speed -= this.friction;
+        if (this.speed < 0) this.speed += this.friction;
+        if (Math.abs(this.speed) < this.friction) this.speed = 0;
+
+        if (this.speed !== 0) {
+            const direction = this.speed > 0 ? 1 : -1;
+            if (this.controls.left) this.angle += 0.03 * direction;
+            if (this.controls.right) this.angle -= 0.03 * direction;
+        }
+
+        this.x -= Math.sin(this.angle) * this.speed;
+        this.y -= Math.cos(this.angle) * this.speed;
+    }
+
+    draw(ctx, drawSensor = false) {
+        if (this.sensor && drawSensor) {
+            this.sensor.draw(ctx);
+        }
+
+        ctx.save();
+        ctx.translate(this.x, this.y);
+        ctx.rotate(-this.angle);
+        if (!this.damaged) {
+            ctx.drawImage(this.mask, -this.width / 2, -this.height / 2, this.width, this.height);
+            ctx.globalCompositeOperation = "multiply";
+        }
+        ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
+        ctx.restore();
+    }
+}
+
+
```

- `11. Automated generations/main.js`（新增）

```diff
+const CONFIG = Object.freeze({
+    populationSize: 100,
+    eliteCount: 5,
+    parentPoolSize: 10,
+    mutationAmount: 0.1,
+    maxTicksPerGeneration: 5000,
+    storageKey: "selfDrivingCarGenerationStateV1"
+});
+
+const carCanvas = document.getElementById("carCanvas");
+const networkCanvas = document.getElementById("networkCanvas");
+const carCtx = carCanvas.getContext("2d");
+const networkCtx = networkCanvas.getContext("2d");
+carCanvas.width = 240;
+networkCanvas.width = 360;
+
+const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);
+const persistedState = loadTrainingState();
+
+let generation = persistedState.generation || 1;
+let bestEver = persistedState.bestEver || null;
+let history = persistedState.history || [];
+let cars = [];
+let traffic = [];
+let generationTick = 0;
+let bestCar = null;
+let paused = false;
+let ticksPerFrame = 1;
+let forceFinish = false;
+
+startGeneration(createInitialBrains());
+requestAnimationFrame(animate);
+
+function createInitialBrains() {
+    if (!bestEver?.brain) return [];
+
+    const brains = [cloneBrain(bestEver.brain)];
+    while (brains.length < CONFIG.populationSize) {
+        const brain = cloneBrain(bestEver.brain);
+        NeuralNetwork.mutate(brain, CONFIG.mutationAmount);
+        brains.push(brain);
+    }
+    return brains;
+}
+
+function startGeneration(brains) {
+    generationTick = 0;
+    forceFinish = false;
+    traffic = createTraffic();
+    cars = [];
+
+    for (let index = 0; index < CONFIG.populationSize; index++) {
+        const car = new Car(road.getLaneCenter(1), 100, 30, 50, "AI");
+        if (brains[index]) car.brain = cloneBrain(brains[index]);
+
+        // 训练元数据不放进 Car 类，避免驾驶模型与世代管理相互耦合。
+        car.training = {
+            startY: car.y,
+            aliveTicks: 0,
+            overtakenTraffic: new Set(),
+            score: 0
+        };
+        cars.push(car);
+    }
+
+    bestCar = cars[0];
+    setStatus(`第 ${generation} 代开始，共 ${CONFIG.populationSize} 辆车。`);
+    updateStats();
+}
+
+function createTraffic() {
+    const positions = [
+        [1, -100],
+        [0, -300], [2, -300],
+        [0, -500], [1, -500],
+        [1, -700], [2, -700]
+    ];
+    return positions.map(([lane, y]) =>
+        new Car(road.getLaneCenter(lane), y, 30, 50, "DUMMY", 2, getRandomColor())
+    );
+}
+
+function simulateTick() {
+    generationTick++;
+
+    for (const vehicle of traffic) {
+        vehicle.update(road.borders, []);
+    }
+
+    for (const car of cars) {
+        car.update(road.borders, traffic);
+        if (!car.damaged) car.training.aliveTicks++;
+
+        traffic.forEach((vehicle, index) => {
+            if (car.y < vehicle.y) car.training.overtakenTraffic.add(index);
+        });
+        car.training.score = calculateFitness(car);
+    }
+
+    bestCar = cars.reduce((best, car) =>
+        car.training.score > best.training.score ? car : best
+    );
+
+    const allDamaged = cars.every(car => car.damaged);
+    if (allDamaged || generationTick >= CONFIG.maxTicksPerGeneration || forceFinish) {
+        evolveNextGeneration();
+    }
+}
+
+function calculateFitness(car) {
+    const progress = car.training.startY - car.y;
+    const survivalReward = car.training.aliveTicks * 0.02;
+    const overtakeReward = car.training.overtakenTraffic.size * 200;
+    const collisionPenalty = car.damaged ? 100 : 0;
+    return progress + survivalReward + overtakeReward - collisionPenalty;
+}
+
+function evolveNextGeneration() {
+    const rankedCars = [...cars].sort(
+        (left, right) => right.training.score - left.training.score
+    );
+    const champion = rankedCars[0];
+    const championScore = champion.training.score;
+
+    history.push({ generation, score: championScore });
+    history = history.slice(-30);
+    if (!bestEver || championScore > bestEver.score) {
+        bestEver = { score: championScore, brain: cloneBrain(champion.brain) };
+    }
+
+    const nextBrains = [];
+    for (let index = 0; index < CONFIG.eliteCount; index++) {
+        nextBrains.push(cloneBrain(rankedCars[index].brain));
+    }
+
+    const parentPool = rankedCars.slice(0, CONFIG.parentPoolSize);
+    while (nextBrains.length < CONFIG.populationSize) {
+        const parentA = tournamentSelect(parentPool);
+        const parentB = tournamentSelect(parentPool);
+        const childBrain = crossoverBrains(parentA.brain, parentB.brain);
+        NeuralNetwork.mutate(childBrain, CONFIG.mutationAmount);
+        nextBrains.push(childBrain);
+    }
+
+    generation++;
+    saveTrainingState();
+    startGeneration(nextBrains);
+    setStatus(`第 ${generation - 1} 代结束，冠军得分 ${formatScore(championScore)}；已自动进入第 ${generation} 代。`);
+}
+
+function tournamentSelect(parentPool) {
+    // 随机抽取三个候选，选择其中得分最高者，兼顾择优和种群多样性。
+    const candidates = Array.from({ length: 3 }, () =>
+        parentPool[Math.floor(Math.random() * parentPool.length)]
+    );
+    return candidates.reduce((best, car) =>
+        car.training.score > best.training.score ? car : best
+    );
+}
+
+function crossoverBrains(parentA, parentB) {
+    const child = cloneBrain(parentA);
+    child.levels.forEach((level, levelIndex) => {
+        level.biases = level.biases.map((value, biasIndex) =>
+            Math.random() < 0.5 ? value : parentB.levels[levelIndex].biases[biasIndex]
+        );
+        level.weights = level.weights.map((row, rowIndex) =>
+            row.map((value, columnIndex) =>
+                Math.random() < 0.5
+                    ? value
+                    : parentB.levels[levelIndex].weights[rowIndex][columnIndex]
+            )
+        );
+    });
+    return child;
+}
+
+function cloneBrain(brain) {
+    return JSON.parse(JSON.stringify(brain));
+}
+
+function animate(time) {
+    if (!paused) {
+        for (let tick = 0; tick < ticksPerFrame; tick++) {
+            simulateTick();
+        }
+    }
+
+    drawSimulation(time);
+    updateStats();
+    requestAnimationFrame(animate);
+}
+
+function drawSimulation(time) {
+    carCanvas.height = window.innerHeight;
+    networkCanvas.height = window.innerHeight;
+
+    carCtx.save();
+    carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);
+    road.draw(carCtx);
+    traffic.forEach(vehicle => vehicle.draw(carCtx));
+
+    carCtx.globalAlpha = 0.15;
+    cars.forEach(car => car.draw(carCtx));
+    carCtx.globalAlpha = 1;
+    bestCar.draw(carCtx, true);
+    carCtx.restore();
+
+    networkCtx.lineDashOffset = -time / 50;
+    Visualizer.drawNetwork(networkCtx, bestCar.brain);
+}
+
+function updateStats() {
+    const aliveCount = cars.filter(car => !car.damaged).length;
+    const progress = generationTick / CONFIG.maxTicksPerGeneration * 100;
+    document.getElementById("generationValue").textContent = generation;
+    document.getElementById("aliveValue").textContent = `${aliveCount} / ${CONFIG.populationSize}`;
+    document.getElementById("progressValue").textContent = `${Math.min(progress, 100).toFixed(1)}%`;
+    document.getElementById("currentScoreValue").textContent = formatScore(bestCar?.training.score || 0);
+    document.getElementById("bestScoreValue").textContent = formatScore(bestEver?.score || 0);
+    document.getElementById("mutationValue").textContent = CONFIG.mutationAmount.toFixed(2);
+}
+
+function togglePause() {
+    paused = !paused;
+    document.getElementById("pauseButton").textContent = paused ? "继续" : "暂停";
+    setStatus(paused ? "训练已暂停。" : `第 ${generation} 代继续训练。`);
+}
+
+function finishGenerationEarly() {
+    forceFinish = true;
+    setStatus(`正在提前结算第 ${generation} 代……`);
+}
+
+function setSimulationSpeed(value) {
+    ticksPerFrame = Math.max(1, Number(value) || 1);
+    setStatus(`模拟速度已切换为 ${ticksPerFrame}×。`);
+}
+
+function resetTraining() {
+    const confirmed = window.confirm("确定清空代数、历史最高分和已保存的大脑吗？");
+    if (!confirmed) return;
+
+    localStorage.removeItem(CONFIG.storageKey);
+    generation = 1;
+    bestEver = null;
+    history = [];
+    startGeneration([]);
+    setStatus("训练数据已清空，已重新生成随机第一代。 ");
+}
+
+function loadTrainingState() {
+    try {
+        return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {};
+    } catch (error) {
+        console.warn("训练状态无法读取，将从第一代重新开始。", error);
+        return {};
+    }
+}
+
+function saveTrainingState() {
+    localStorage.setItem(CONFIG.storageKey, JSON.stringify({
+        generation,
+        bestEver,
+        history
+    }));
+}
+
+function setStatus(message) {
+    document.getElementById("statusText").textContent = message;
+}
+
+function formatScore(score) {
+    return Number(score).toFixed(1);
+}
+
```

- `AGENTS.md` +2 -1

```diff
-- 根目录下的 `1. Car driving mechanics` 至 `10. Live stream variant` 是相互独立的课程阶段，每个目录均以 `index.html` 为入口。
+- 根目录下的 `1. Car driving mechanics` 至 `10. Live stream variant` 是原课程阶段，每个目录均以 `index.html` 为入口。
+- `11. Automated generations` 是在第 9 阶段基础上新增的自动世代训练版本，具备自动评估、精英保留、亲本选择、交叉、变异、持久化和训练控制面板。
```

- `.agentdocs/index.md` +4 -1

```diff
+- `workflow/20260809144427-add-automated-generations.md` - 新增第 11 阶段完整自动 Generation 管理；需要理解或维护自动训练、评分、选择、交叉、变异及持久化时读取。
-- 推荐从 `10. Live stream variant/index.html` 查看功能最完整的版本。
+- 推荐从 `11. Automated generations/index.html` 体验自动化训练；原课程内容仍以第 9、10 阶段作为对应实验版本。
+- 第 11 阶段每代 100 辆车，最多运行 5000 帧；保留前 5 名精英，从前 10 名中选择亲本并交叉，其余个体使用 `0.1` 强度变异。
+- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV1`，不会覆盖第 9 阶段的 `bestBrain`。
```

## 测试用例

### TC-001 首代自动启动

- 类型：功能测试
- 优先级：高
- 前置条件：清空第 11 阶段训练数据。
- 操作步骤：
  1. 打开 `11. Automated generations/index.html`。
  2. 观察状态面板和车辆画布。
- 预期结果：
  - 显示第 1 代和 100 辆车辆。
  - 车辆自动开始运行。
  - 页面无 JavaScript 运行时错误。
- 是否通过：待浏览器验证。

### TC-002 自动进入下一代

- 类型：功能测试
- 优先级：高
- 前置条件：第 11 阶段正在运行。
- 操作步骤：
  1. 点击“提前结束本代”，或等待 5000 个模拟帧。
  2. 观察代数和车辆状态。
- 预期结果：
  - 当前代自动结算。
  - 代数增加 1。
  - 生成 100 辆新车并继续运行，无需刷新页面。
- 是否通过：待浏览器验证。

### TC-003 精英、交叉与变异

- 类型：逻辑测试
- 优先级：高
- 前置条件：一代训练结算。
- 操作步骤：
  1. 对本代车辆按适应度降序排列。
  2. 检查下一代大脑来源。
- 预期结果：
  - 前 5 名大脑完整保留。
  - 其余大脑来自前 10 名亲本的交叉。
  - 交叉后应用 0.1 强度变异。
- 是否通过：待验证。

### TC-004 训练状态持久化

- 类型：功能测试
- 优先级：高
- 前置条件：至少完成一代。
- 操作步骤：
  1. 记录当前代数和历史最高分。
  2. 刷新页面。
- 预期结果：
  - 代数和历史最高分仍然存在。
  - 新种群以历史最佳大脑及其变异体开始。
- 是否通过：待浏览器验证。

### TC-005 训练控制

- 类型：交互测试
- 优先级：中
- 前置条件：训练正在运行。
- 操作步骤：
  1. 依次测试暂停、继续和模拟速度。
  2. 点击“清空训练”并确认。
- 预期结果：
  - 暂停时模拟状态不再推进，继续后恢复。
  - 速度可切换为 1×、5×、20×。
  - 清空后代数回到 1，历史最高分归零。
- 是否通过：待浏览器验证。

