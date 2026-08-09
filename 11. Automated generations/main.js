const CONFIG = Object.freeze({
    eliteCount: 5,
    parentPoolSize: 10,
    randomImmigrantCount: 10,
    stagnationTicks: 180,
    trafficCount: 10,
    trafficRecycleBehindDistance: 400,
    cameraSmoothing: 0.15,
    cameraBaseMaxStep: 8,
    followingEnterDistance: 170,
    followingExitDistance: 220,
    followingReleaseTicks: 60,
    followingEliminationTicks: 300,
    // V6 使用循环生成的无限交通流，旧版有限场景分数不再具有可比性。
    storageKey: "selfDrivingCarGenerationStateV6"
});

const DEFAULT_TRAINING_SETTINGS = Object.freeze({
    generationTicks: 5000,
    populationSize: 100,
    mutationAmount: 0.1
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

const carCanvas = document.getElementById("carCanvas");
const networkCanvas = document.getElementById("networkCanvas");
const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
carCanvas.width = 240;
networkCanvas.width = 360;

const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);
const persistedState = loadTrainingState();
let trainingSettings = sanitizeTrainingSettings(persistedState.settings);
let pendingTrainingSettings = { ...trainingSettings };

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
let trafficPatternIndex = 0;
let nextTrafficId = 1;
let cameraY = 100;

startGeneration(createInitialBrains());
syncTrainingSettingsControls();
requestAnimationFrame(animate);

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

function startGeneration(brains) {
    generationTick = 0;
    forceFinish = false;
    lastProgressTick = 0;
    trafficPatternIndex = 0;
    nextTrafficId = 1;
    traffic = createTraffic();
    cars = [];

    for (let index = 0; index < trainingSettings.populationSize; index++) {
        const car = new Car(road.getLaneCenter(1), 100, 30, 50, "AI");
        if (brains[index]) car.brain = cloneBrain(brains[index]);

        // 训练元数据不放进 Car 类，避免驾驶模型与世代管理相互耦合。
        car.training = {
            startY: car.y,
            lastProgressY: car.y,
            aliveTicks: 0,
            idleTicks: 0,
            followingTicks: 0,
            consecutiveFollowingTicks: 0,
            missedFollowingTicks: 0,
            longestFollowingTicks: 0,
            eliminatedForFollowing: false,
            overtakenTraffic: new Set(),
            score: 0
        };
        cars.push(car);
    }

    bestCar = cars[0];
    cameraY = bestCar.y;
    setStatus(`第 ${generation} 代开始，共 ${trainingSettings.populationSize} 辆车。`);
    updateStats();
}

function createTraffic() {
    const vehicles = [];
    let nextY = 100;
    for (let index = 0; index < CONFIG.trafficCount; index++) {
        const descriptor = getNextTrafficDescriptor();
        nextY -= descriptor.gap;
        const vehicle = new Car(
            road.getLaneCenter(descriptor.lane),
            nextY,
            30,
            50,
            "DUMMY",
            2,
            getRandomColor()
        );
        vehicle.trafficId = nextTrafficId++;
        vehicles.push(vehicle);
    }
    return vehicles;
}

function getNextTrafficDescriptor() {
    const descriptor = TRAFFIC_PATTERN[trafficPatternIndex % TRAFFIC_PATTERN.length];
    trafficPatternIndex++;
    return descriptor;
}

function simulateTick() {
    generationTick++;
    let aliveVehicleProgressed = false;

    for (const vehicle of traffic) {
        vehicle.update(road.borders, []);
    }

    for (const car of cars) {
        car.update(road.borders, traffic);
        if (!car.damaged) car.training.aliveTicks++;
        if (recordAliveProgress(car)) {
            aliveVehicleProgressed = true;
        }
        if (!car.damaged && Math.abs(car.speed) < 0.1) {
            car.training.idleTicks++;
        }
        updateFollowingState(car);

        traffic.forEach(vehicle => {
            if (car.y < vehicle.y) car.training.overtakenTraffic.add(vehicle.trafficId);
        });
        car.training.score = calculateFitness(car);
    }

    bestCar = cars.reduce((best, car) =>
        car.training.score > best.training.score ? car : best
    );
    recyclePassedTraffic();

    if (aliveVehicleProgressed) {
        lastProgressTick = generationTick;
    }

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

function recyclePassedTraffic() {
    const aliveCars = cars.filter(car => !car.damaged);
    if (aliveCars.length === 0) return;

    const leaderY = Math.min(...aliveCars.map(car => car.y));
    let frontmostTrafficY = Math.min(
        ...traffic.map(vehicle => vehicle.y),
        leaderY - CONFIG.trafficRecycleBehindDistance
    );

    for (const vehicle of traffic) {
        if (vehicle.y <= leaderY + CONFIG.trafficRecycleBehindDistance) continue;

        const descriptor = getNextTrafficDescriptor();
        frontmostTrafficY -= descriptor.gap;
        vehicle.x = road.getLaneCenter(descriptor.lane);
        vehicle.y = frontmostTrafficY;
        vehicle.speed = 0;
        vehicle.angle = 0;
        vehicle.damaged = false;
        vehicle.trafficId = nextTrafficId++;
        // 立即重建碰撞多边形，避免回收发生在绘制前时使用旧位置。
        vehicle.update(road.borders, []);
    }
}

function recordAliveProgress(car) {
    if (car.damaged) return false;

    // 只检查当前存活车辆自身是否继续前进，不再要求它打破已损毁领先车的历史纪录。
    if (car.y < car.training.lastProgressY - 1) {
        car.training.lastProgressY = car.y;
        return true;
    }
    return false;
}

function updateFollowingState(car) {
    if (car.damaged) {
        car.training.consecutiveFollowingTicks = 0;
        car.training.missedFollowingTicks = 0;
        return;
    }

    const followingSessionActive = car.training.consecutiveFollowingTicks > 0;
    const distanceThreshold = followingSessionActive
        ? CONFIG.followingExitDistance
        : CONFIG.followingEnterDistance;
    const lateralThresholdScale = followingSessionActive ? 1 : 0.75;
    const isFollowing = traffic.some(vehicle => {
        const forwardGap = car.y - vehicle.y;
        const sameLaneThreshold = (car.width + vehicle.width) * lateralThresholdScale;
        return forwardGap > 0
            && forwardGap <= distanceThreshold
            && Math.abs(car.x - vehicle.x) < sameLaneThreshold;
    });

    if (isFollowing) {
        car.training.followingTicks++;
        car.training.consecutiveFollowingTicks++;
        car.training.missedFollowingTicks = 0;
        car.training.longestFollowingTicks = Math.max(
            car.training.longestFollowingTicks,
            car.training.consecutiveFollowingTicks
        );
        if (car.training.consecutiveFollowingTicks >= CONFIG.followingEliminationTicks) {
            // 不替神经网络选择转向方向；直接停止该个体，避免不安全的强制转向干扰训练。
            car.training.eliminatedForFollowing = true;
            car.damaged = true;
        }
    } else {
        car.training.missedFollowingTicks++;
        // 必须持续脱离一段时间才结束本次跟车，过滤车距和横向位置的短暂抖动。
        if (car.training.missedFollowingTicks >= CONFIG.followingReleaseTicks) {
            car.training.consecutiveFollowingTicks = 0;
            car.training.missedFollowingTicks = 0;
        }
    }
}

function calculateFitness(car) {
    const progress = car.training.startY - car.y;
    const progressReward = progress * 2;
    const overtakeReward = car.training.overtakenTraffic.size * 1000;
    const collisionPenalty = car.damaged ? 150 : 0;
    const followingEliminationPenalty = car.training.eliminatedForFollowing ? 5000 : 0;
    const idlePenalty = car.training.idleTicks * 0.05;

    // 跟车过程不重复扣分；达到硬阈值后由淘汰标记一次性施加足够大的惩罚。
    return progressReward + overtakeReward
        - collisionPenalty
        - followingEliminationPenalty
        - idlePenalty;
}

function evolveNextGeneration(reason) {
    const rankedCars = [...cars].sort(
        (left, right) => right.training.score - left.training.score
    );
    const champion = rankedCars[0];
    const championScore = champion.training.score;

    history.push({ generation, score: championScore });
    history = history.slice(-30);
    if (!bestEver || championScore > bestEver.score) {
        bestEver = { score: championScore, brain: cloneBrain(champion.brain) };
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
    setStatus(`第 ${generation - 1} 代因“${reason}”结束，冠军得分 ${formatScore(championScore)}；已进入第 ${generation} 代。`);
}

function tournamentSelect(parentPool) {
    // 随机抽取三个候选，选择其中得分最高者，兼顾择优和种群多样性。
    const candidates = Array.from({ length: 3 }, () =>
        parentPool[Math.floor(Math.random() * parentPool.length)]
    );
    return candidates.reduce((best, car) =>
        car.training.score > best.training.score ? car : best
    );
}

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

function cloneBrain(brain) {
    return JSON.parse(JSON.stringify(brain));
}

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

function updateCameraPosition() {
    const smoothedTarget = lerp(cameraY, bestCar.y, CONFIG.cameraSmoothing);
    const requestedStep = smoothedTarget - cameraY;
    const maxStep = CONFIG.cameraBaseMaxStep * Math.max(1, ticksPerFrame);
    const limitedStep = Math.max(-maxStep, Math.min(maxStep, requestedStep));
    cameraY += limitedStep;
}

function updateStats() {
    const aliveCount = cars.filter(car => !car.damaged).length;
    const progress = generationTick / trainingSettings.generationTicks * 100;
    document.getElementById("generationValue").textContent = generation;
    document.getElementById("aliveValue").textContent = `${aliveCount} / ${trainingSettings.populationSize}`;
    document.getElementById("progressValue").textContent = `${Math.min(progress, 100).toFixed(1)}%`;
    document.getElementById("currentScoreValue").textContent = formatScore(bestCar?.training.score || 0);
    document.getElementById("bestScoreValue").textContent = formatScore(bestEver?.score || 0);
    document.getElementById("overtakeValue").textContent = bestCar?.training.overtakenTraffic.size || 0;
    document.getElementById("trafficGeneratedValue").textContent = nextTrafficId - 1;
    document.getElementById("followingValue").textContent = `${bestCar?.training.longestFollowingTicks || 0} 帧`;
    document.getElementById("followingEliminatedValue").textContent = cars.filter(
        car => car.training.eliminatedForFollowing
    ).length;
    document.getElementById("mutationValue").textContent = trainingSettings.mutationAmount.toFixed(2);
}

function applyTrainingSettings() {
    pendingTrainingSettings = sanitizeTrainingSettings({
        generationTicks: document.getElementById("generationTicksInput").value,
        populationSize: document.getElementById("populationSizeInput").value,
        mutationAmount: document.getElementById("mutationAmountInput").value
    });
    syncTrainingSettingsControls(pendingTrainingSettings);
    setStatus(
        `参数已保存，将在第 ${generation + 1} 代生效：`
        + `${pendingTrainingSettings.generationTicks} 帧、`
        + `${pendingTrainingSettings.populationSize} 辆车、`
        + `变异 ${pendingTrainingSettings.mutationAmount.toFixed(2)}。`
    );
}

function activatePendingTrainingSettings() {
    trainingSettings = { ...pendingTrainingSettings };
    syncTrainingSettingsControls();
}

function sanitizeTrainingSettings(settings = {}) {
    return {
        generationTicks: clampNumber(settings.generationTicks, 500, 50000, 5000, true),
        populationSize: clampNumber(settings.populationSize, 10, 500, 100, true),
        mutationAmount: clampNumber(settings.mutationAmount, 0, 1, 0.1, false)
    };
}

function clampNumber(value, min, max, fallback, integer) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const clamped = Math.max(min, Math.min(max, parsed));
    return integer ? Math.round(clamped) : clamped;
}

function syncTrainingSettingsControls(settings = trainingSettings) {
    document.getElementById("generationTicksInput").value = settings.generationTicks;
    document.getElementById("populationSizeInput").value = settings.populationSize;
    document.getElementById("mutationAmountInput").value = settings.mutationAmount;
}

function togglePause() {
    paused = !paused;
    document.getElementById("pauseButton").textContent = paused ? "继续" : "暂停";
    setStatus(paused ? "训练已暂停。" : `第 ${generation} 代继续训练。`);
}

function finishGenerationEarly() {
    forceFinish = true;
    setStatus(`正在提前结算第 ${generation} 代……`);
}

function setSimulationSpeed(value) {
    ticksPerFrame = Math.max(1, Number(value) || 1);
    setStatus(`模拟速度已切换为 ${ticksPerFrame}×。`);
}

function resetTraining() {
    const confirmed = window.confirm("确定清空代数、历史最高分和已保存的大脑吗？");
    if (!confirmed) return;

    localStorage.removeItem(CONFIG.storageKey);
    generation = 1;
    bestEver = null;
    history = [];
    startGeneration([]);
    setStatus("训练数据已清空，已重新生成随机第一代。 ");
}

function loadTrainingState() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {};
    } catch (error) {
        console.warn("训练状态无法读取，将从第一代重新开始。", error);
        return {};
    }
}

function saveTrainingState() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        generation,
        bestEver,
        history,
        settings: trainingSettings
    }));
}

function setStatus(message) {
    document.getElementById("statusText").textContent = message;
}

function formatScore(score) {
    return Number(score).toFixed(1);
}
