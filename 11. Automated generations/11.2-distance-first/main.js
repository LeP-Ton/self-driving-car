/**
 * 第 11.2 阶段：对照第 9 阶段“最靠前车辆”的距离优先探索版本
 *
 * 一代的完整生命周期：
 * 1. startGeneration：根据传入的大脑创建 AI 种群与无限交通流。
 * 2. simulateTick：推进车辆、记录行为、计算前进距离并判断本代是否结束。
 * 3. evolveNextGeneration：排名、保留精英、选择亲本、交叉、变异并创建下一代。
 * 4. animate：按面板倍速重复模拟，再统一绘制画面和统计数据。
 *
 * “最佳车”只按前进距离选择；是否碰撞不参与排序，也不作为平局条件。
 */

// ==================== 固定规则与默认参数 ====================

const CONFIG = Object.freeze({
    // 排名前 5 的大脑不做变异，原样进入下一代，防止优秀能力丢失。
    eliteCount: 5,
    // 只有本代前 10 名有资格参与交叉繁殖。
    parentPoolSize: 10,
    // 每代加入 10 个完全随机大脑，防止种群长期困在同一种策略。
    randomImmigrantCount: 10,
    // 所有存活车辆连续 180 帧都没有前进时，提前结束本代。
    stagnationTicks: 180,
    // 只维护固定数量的交通车对象，通过回收位置形成无限交通流。
    trafficCount: 10,
    trafficRecycleBehindDistance: 400,
    // 镜头使用插值和最大步长限制，减少实时最佳车辆切换造成的抖动。
    cameraSmoothing: 0.15,
    cameraBaseMaxStep: 8,
    // 11.2 使用独立存储，避免与第 11 阶段和 11.1 相互覆盖训练记录。
    storageKey: "selfDrivingCarGenerationState11_2DistanceFirstV1"
});

// 这些参数可在面板修改；为保证本代评分公平，只在下一代开始时生效。
const DEFAULT_TRAINING_SETTINGS = Object.freeze({
    generationTicks: 10000,
    populationSize: 100,
    mutationAmount: 0.1,
    minSpeed: 2
});

const TRAFFIC_PATTERN = Object.freeze([
    { lane: 1, gap: 200 },
    { lane: 0, gap: 220 },
    { lane: 2, gap: 180 },
    { lane: 0, gap: 260 },
    { lane: 1, gap: 190 },
    { lane: 2, gap: 240 },
    { lane: 1, gap: 210 },
    { lane: 0, gap: 230 },
    { lane: 2, gap: 200 }
]);

// ==================== 页面对象与运行状态 ====================

const carCanvas = document.getElementById("carCanvas");
const networkCanvas = document.getElementById("networkCanvas");
const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
carCanvas.width = 240;
networkCanvas.width = 360;

const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);
const trafficManager = new InfiniteTrafficManager({
    minimumAheadCount: CONFIG.trafficCount,
    recycleBehindDistance: CONFIG.trafficRecycleBehindDistance,
    trafficPattern: TRAFFIC_PATTERN,
    getLaneCenter: lane => road.getLaneCenter(lane),
    createVehicle: (x, y) => new Car(x, y, 30, 50, "DUMMY", 2, getRandomColor())
});
const persistedState = loadTrainingState();
let trainingSettings = sanitizeTrainingSettings(persistedState.settings);
// 面板修改先写入 pending，换代时再覆盖当前生效参数。
let pendingTrainingSettings = { ...trainingSettings };

// 世代级状态：刷新页面后，代数、历史最佳和最近成绩会从 localStorage 恢复。
let generation = persistedState.generation || 1;
let bestEver = persistedState.bestEver || null;
let history = persistedState.history || [];
let cars = [];
let traffic = [];
let generationTick = 0;
let bestCar = null;
let paused = false;
let ticksPerFrame = 1;
let forceFinish = false;
let lastProgressTick = 0;
let cameraY = 100;

// 页面加载后立即创建种群，并启动浏览器动画循环。
startGeneration(createInitialBrains());
syncTrainingSettingsControls();
requestAnimationFrame(animate);

// ==================== 世代初始化 ====================

/**
 * 页面刷新后创建初始大脑列表。
 * 第一个个体完整继承历史最佳，其余个体在历史最佳基础上变异。
 * 没有历史最佳时返回空数组，让 Car 构造函数随机创建第一代大脑。
 */
function createInitialBrains() {
    if (!bestEver?.brain) return [];

    const brains = [cloneBrain(bestEver.brain)];
    while (brains.length < trainingSettings.populationSize) {
        const brain = cloneBrain(bestEver.brain);
        NeuralNetwork.mutate(brain, trainingSettings.mutationAmount);
        brains.push(brain);
    }
    return brains;
}

/**
 * 开始一代训练：重置本代计数，创建交通车和指定数量的 AI 车辆。
 * @param {Array<object>} brains 上一代产生的大脑；不足的部分使用随机大脑。
 */
function startGeneration(brains) {
    generationTick = 0;
    forceFinish = false;
    lastProgressTick = 0;
    traffic = trafficManager.reset(100);
    cars = [];

    for (let index = 0; index < trainingSettings.populationSize; index++) {
        const car = new Car(
            road.getLaneCenter(1),
            100,
            30,
            50,
            "AI",
            3,
            "blue",
            trainingSettings.minSpeed
        );
        if (brains[index]) car.brain = cloneBrain(brains[index]);

        // 训练元数据不放进 Car 类，避免驾驶模型与世代管理相互耦合。
        car.training = {
            // startY 用于累计前进距离；lastProgressY 用于判断种群是否停滞。
            startY: car.y,
            lastProgressY: car.y,
            // 超车集合仅用于面板统计，不参与距离筛选。
            overtakenTraffic: new Set(),
            distance: 0
        };
        cars.push(car);
    }

    bestCar = cars[0];
    cameraY = bestCar.y;
    setStatus(`第 ${generation} 代开始，共 ${trainingSettings.populationSize} 辆车。`);
    updateStats();
}

// ==================== 单帧模拟与本代结束条件 ====================

/**
 * 推进一个模拟帧。
 * 更新顺序很重要：先移动交通车，再移动所有 AI，随后评分、回收交通车并判断换代。
 */
function simulateTick() {
    generationTick++;
    let aliveVehicleProgressed = false;

    for (const vehicle of traffic) {
        vehicle.update(road.borders, []);
    }

    for (const car of cars) {
        car.update(road.borders, traffic);
        if (recordAliveProgress(car)) {
            aliveVehicleProgressed = true;
        }
        // Set 以唯一 trafficId 去重，同一辆交通车在一次回收周期内只计一次超车。
        traffic.forEach(vehicle => {
            if (car.y < vehicle.y) car.training.overtakenTraffic.add(vehicle.trafficId);
        });
        car.training.distance = calculateDistance(car);
    }

    // 对照第 9 阶段的 y 最小规则，实时最佳只取前进距离最远的车辆。
    bestCar = cars.reduce((best, car) =>
        compareCarsForSelection(car, best) > 0 ? car : best
    );
    traffic = trafficManager.maintain(cars.filter(car => !car.damaged));

    if (aliveVehicleProgressed) {
        lastProgressTick = generationTick;
    }

    // 本代有四种结束方式：全员淘汰、到达帧上限、持续停滞、用户手动结束。
    const allDamaged = cars.every(car => car.damaged);
    const stagnated = generationTick - lastProgressTick >= CONFIG.stagnationTicks;
    if (allDamaged || generationTick >= trainingSettings.generationTicks || stagnated || forceFinish) {
        const reason = forceFinish
            ? "手动提前结算"
            : allDamaged
                ? "全部车辆损毁"
                : stagnated
                    ? "连续无前进，自动结束停滞世代"
                    : "达到最大模拟帧数";
        evolveNextGeneration(reason);
    }
}

// ==================== 无限交通与进展规则 ====================

/**
 * 判断一辆存活车辆是否相对自身记录继续向前。
 * 不与已撞毁领先车的历史位置比较，避免追赶过程被误判为全体停滞。
 */
function recordAliveProgress(car) {
    if (car.damaged) return false;

    // 只检查当前存活车辆自身是否继续前进，不再要求它打破已损毁领先车的历史纪录。
    if (car.y < car.training.lastProgressY - 1) {
        car.training.lastProgressY = car.y;
        return true;
    }
    return false;
}

// ==================== 距离排序与遗传算法 ====================

/**
 * 与第 9 阶段相同，只计算车辆从起点向前行驶的距离。
 * 碰撞会让车辆停止移动，但 damaged 不参与亲本排名或历史最佳比较。
 */
function calculateDistance(car) {
    return car.training.startY - car.y;
}

/**
 * 对照第 9 阶段的“当前 y 最小”，只比较前进距离。
 * 不读取 damaged，因此跑得更远但已经碰撞的车辆仍可成为冠军或亲本。
 */
function compareCarsForSelection(left, right) {
    return left.training.distance - right.training.distance;
}

/**
 * 结算本代并生成下一代：
 * 1. 只按前进距离排名并保存本代冠军。
 * 2. 原样保留精英。
 * 3. 从前 10 名中选择两个亲本，交叉大脑后执行随机变异。
 * 4. 用完全随机个体补足种群多样性。
 */
function evolveNextGeneration(reason) {
    const rankedCars = [...cars].sort(
        (left, right) => compareCarsForSelection(right, left)
    );
    const champion = rankedCars[0];
    const championDistance = champion.training.distance;
    const championSurvived = !champion.damaged;

    history.push({ generation, distance: championDistance, survived: championSurvived });
    history = history.slice(-30);
    if (isBetterThanHistoricalBest(champion)) {
        bestEver = {
            distance: championDistance,
            survived: championSurvived,
            brain: cloneBrain(champion.brain)
        };
    }

    activatePendingTrainingSettings();

    const targetPopulation = trainingSettings.populationSize;
    const eliteCount = Math.min(CONFIG.eliteCount, targetPopulation, rankedCars.length);
    const randomImmigrantCount = Math.min(
        CONFIG.randomImmigrantCount,
        targetPopulation - eliteCount
    );
    const nextBrains = [];
    for (let index = 0; index < eliteCount; index++) {
        nextBrains.push(cloneBrain(rankedCars[index].brain));
    }

    const parentPool = rankedCars.slice(0, Math.min(CONFIG.parentPoolSize, rankedCars.length));
    const inheritedCount = targetPopulation - randomImmigrantCount;
    while (nextBrains.length < inheritedCount) {
        const parentA = tournamentSelect(parentPool);
        const parentB = tournamentSelect(parentPool);
        const childBrain = crossoverBrains(parentA.brain, parentB.brain);
        NeuralNetwork.mutate(childBrain, trainingSettings.mutationAmount);
        nextBrains.push(childBrain);
    }

    // 每代保留少量完全随机个体，防止整个种群被坏亲本锁死在同一种行为上。
    while (nextBrains.length < targetPopulation) {
        nextBrains.push(new NeuralNetwork([5, 6, 4]));
    }

    generation++;
    saveTrainingState();
    startGeneration(nextBrains);
    setStatus(`第 ${generation - 1} 代因“${reason}”结束，冠军距离 ${formatDistance(championDistance)}；已进入第 ${generation} 代。`);
}

/** 历史最佳同样只比较距离，碰撞状态仅保留为观察数据。 */
function isBetterThanHistoricalBest(champion) {
    if (!bestEver) return true;
    return champion.training.distance > bestEver.distance;
}

/**
 * 锦标赛选择：随机抽取三个候选，返回其中选择优先级最高者。
 * 它让距离更远的车辆更容易成为亲本，同时不给第一名绝对垄断权。
 */
function tournamentSelect(parentPool) {
    const candidates = Array.from({ length: 3 }, () =>
        parentPool[Math.floor(Math.random() * parentPool.length)]
    );
    return candidates.reduce((best, car) =>
        compareCarsForSelection(car, best) > 0 ? car : best
    );
}

/**
 * 双亲交叉：子代每一个权重和偏置都以 50% 概率继承父本 A 或父本 B。
 * 返回交叉后的新对象，不直接修改两个亲本。
 */
function crossoverBrains(parentA, parentB) {
    const child = cloneBrain(parentA);
    child.levels.forEach((level, levelIndex) => {
        level.biases = level.biases.map((value, biasIndex) =>
            Math.random() < 0.5 ? value : parentB.levels[levelIndex].biases[biasIndex]
        );
        level.weights = level.weights.map((row, rowIndex) =>
            row.map((value, columnIndex) =>
                Math.random() < 0.5
                    ? value
                    : parentB.levels[levelIndex].weights[rowIndex][columnIndex]
            )
        );
    });
    return child;
}

/** 深拷贝大脑，防止子代变异反向修改亲本或精英。 */
function cloneBrain(brain) {
    return JSON.parse(JSON.stringify(brain));
}

// ==================== 动画与绘制 ====================

/** 浏览器动画入口：根据倍速执行若干模拟帧，然后只绘制一次。 */
function animate(time) {
    if (!paused) {
        for (let tick = 0; tick < ticksPerFrame; tick++) {
            simulateTick();
        }

        // 如果换代恰好发生在本动画帧的最后一步，新车辆还没有初始化传感器、
        // 神经网络输入和碰撞多边形；绘制前补一个模拟步，使 1× 与高倍速行为一致。
        if (generationTick === 0) {
            simulateTick();
        }
    }

    drawSimulation(time);
    updateStats();
    requestAnimationFrame(animate);
}

/** 绘制道路、交通车、AI 种群、最佳车传感器和最佳车神经网络。 */
function drawSimulation(time) {
    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;
    updateCameraPosition();

    carCtx.save();
    carCtx.translate(0, -cameraY + carCanvas.height * 0.7);
    road.draw(carCtx);
    traffic.forEach(vehicle => vehicle.draw(carCtx));

    carCtx.globalAlpha = 0.15;
    cars.forEach(car => car.draw(carCtx));
    carCtx.globalAlpha = 1;
    bestCar.draw(carCtx, true);
    carCtx.restore();

    networkCtx.lineDashOffset = -time / 50;
    Visualizer.drawNetwork(networkCtx, bestCar.brain);
}

/** 平滑追踪实时最佳车辆，并限制单次位移，避免最佳车切换造成整屏跳动。 */
function updateCameraPosition() {
    const smoothedTarget = lerp(cameraY, bestCar.y, CONFIG.cameraSmoothing);
    const requestedStep = smoothedTarget - cameraY;
    const maxStep = CONFIG.cameraBaseMaxStep * Math.max(1, ticksPerFrame);
    const limitedStep = Math.max(-maxStep, Math.min(maxStep, requestedStep));
    cameraY += limitedStep;
}

// ==================== 面板交互与训练参数 ====================

/** 将当前世代状态同步到右侧控制面板。 */
function updateStats() {
    const aliveCount = cars.filter(car => !car.damaged).length;
    const progress = generationTick / trainingSettings.generationTicks * 100;
    document.getElementById("generationValue").textContent = generation;
    document.getElementById("aliveValue").textContent = `${aliveCount} / ${trainingSettings.populationSize}`;
    document.getElementById("progressValue").textContent = `${Math.min(progress, 100).toFixed(1)}%`;
    document.getElementById("currentScoreValue").textContent = formatDistance(bestCar?.training.distance || 0);
    document.getElementById("bestScoreValue").textContent = formatDistance(bestEver?.distance || 0);
    document.getElementById("overtakeValue").textContent = bestCar?.training.overtakenTraffic.size || 0;
    document.getElementById("trafficGeneratedValue").textContent =
        trafficManager.getStats().generatedEventCount;
    document.getElementById("mutationValue").textContent = trainingSettings.mutationAmount.toFixed(2);
}

/** 读取并校验用户输入，只保存为下一代待生效参数。 */
function applyTrainingSettings() {
    pendingTrainingSettings = sanitizeTrainingSettings({
        generationTicks: document.getElementById("generationTicksInput").value,
        populationSize: document.getElementById("populationSizeInput").value,
        mutationAmount: document.getElementById("mutationAmountInput").value,
        minSpeed: document.getElementById("minSpeedInput").value
    });
    syncTrainingSettingsControls(pendingTrainingSettings);
    setStatus(
        `参数已保存，将在第 ${generation + 1} 代生效：`
        + `${pendingTrainingSettings.generationTicks} 帧、`
        + `${pendingTrainingSettings.populationSize} 辆车、`
        + `变异 ${pendingTrainingSettings.mutationAmount.toFixed(2)}、`
        + `最小速度 ${pendingTrainingSettings.minSpeed.toFixed(2)}。`
    );
}

/** 换代时激活待生效参数，保证同一代始终使用同一套评测规则。 */
function activatePendingTrainingSettings() {
    trainingSettings = { ...pendingTrainingSettings };
    syncTrainingSettingsControls();
}

/** 将外部或本地存储中的训练参数限制到面板声明的安全范围。 */
function sanitizeTrainingSettings(settings = {}) {
    return {
        generationTicks: clampNumber(settings.generationTicks, 500, 50000, 10000, true),
        populationSize: clampNumber(settings.populationSize, 10, 500, 100, true),
        mutationAmount: clampNumber(settings.mutationAmount, 0, 1, 0.1, false),
        minSpeed: clampNumber(settings.minSpeed, 0, 3, 2, false)
    };
}

/** 将输入转换为指定范围内的数字；无效值回退到默认值。 */
function clampNumber(value, min, max, fallback, integer) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const clamped = Math.max(min, Math.min(max, parsed));
    return integer ? Math.round(clamped) : clamped;
}

/** 把校验后的值写回输入框，让用户看到最终实际采用的参数。 */
function syncTrainingSettingsControls(settings = trainingSettings) {
    document.getElementById("generationTicksInput").value = settings.generationTicks;
    document.getElementById("populationSizeInput").value = settings.populationSize;
    document.getElementById("mutationAmountInput").value = settings.mutationAmount;
    document.getElementById("minSpeedInput").value = settings.minSpeed;
}

/** 暂停或恢复模拟；绘制循环仍保持运行。 */
function togglePause() {
    paused = !paused;
    document.getElementById("pauseButton").textContent = paused ? "继续" : "暂停";
    setStatus(paused ? "训练已暂停。" : `第 ${generation} 代继续训练。`);
}

/** 标记手动结算，请求会在下一个模拟帧中统一处理。 */
function finishGenerationEarly() {
    forceFinish = true;
    setStatus(`正在提前结算第 ${generation} 代……`);
}

/** 设置每个浏览器动画帧要执行的模拟帧数量。 */
function setSimulationSpeed(value) {
    ticksPerFrame = Math.max(1, Number(value) || 1);
    setStatus(`模拟速度已切换为 ${ticksPerFrame}×。`);
}

/** 清空 V7 训练进度并以当前生效参数重新创建随机第一代。 */
function resetTraining() {
    const confirmed = window.confirm("确定清空代数、历史最远距离和已保存的大脑吗？");
    if (!confirmed) return;

    localStorage.removeItem(CONFIG.storageKey);
    generation = 1;
    bestEver = null;
    history = [];
    startGeneration([]);
    setStatus("训练数据已清空，已重新生成随机第一代。 ");
}

// ==================== 本地持久化与通用显示 ====================

/** 从 localStorage 恢复代数、冠军大脑、历史成绩和训练参数。 */
function loadTrainingState() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {};
    } catch (error) {
        console.warn("训练状态无法读取，将从第一代重新开始。", error);
        return {};
    }
}

/** 每代结束时保存可跨刷新继续使用的最小训练状态。 */
function saveTrainingState() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        generation,
        bestEver,
        history,
        settings: trainingSettings
    }));
}

/** 显示最近一次训练事件或用户操作结果。 */
function setStatus(message) {
    document.getElementById("statusText").textContent = message;
}

/** 所有距离统一显示一位小数。 */
function formatDistance(distance) {
    return Number(distance).toFixed(1);
}
