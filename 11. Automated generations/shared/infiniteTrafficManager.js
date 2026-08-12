/**
 * InfiniteTrafficManager（无限交通管理器）统一管理第 11 阶段的交通车生命周期。
 *
 * 职责边界：
 * 1. 在最靠前有效测试车前方维持指定数量的交通车。
 * 2. 只有交通车落到最后方有效测试车之后，才回收到对象池。
 * 3. 复用对象时重置运动状态，并为新一轮超车事件分配唯一 ID。
 *
 * 管理器不判断哪些测试车“有效”，也不负责镜头、训练排名或超车奖励；
 * 调用方应把符合本阶段规则的车辆传给 maintain()。
 */
class InfiniteTrafficManager {
    constructor({
        minimumAheadCount,
        recycleBehindDistance,
        trafficPattern,
        createVehicle,
        getLaneCenter
    }) {
        if (!Array.isArray(trafficPattern) || trafficPattern.length === 0) {
            throw new Error("无限交通管理器需要至少一个交通生成模板。");
        }

        this.minimumAheadCount = minimumAheadCount;
        this.recycleBehindDistance = recycleBehindDistance;
        this.trafficPattern = trafficPattern;
        this.createVehicle = createVehicle;
        this.getLaneCenter = getLaneCenter;

        this.vehicles = [];
        this.pool = [];
        this.patternIndex = 0;
        this.nextTrafficId = 1;
    }

    /** 开始新世代并从起点向前铺设首批交通车。 */
    reset(startY) {
        this.vehicles = [];
        this.pool = [];
        this.patternIndex = 0;
        this.nextTrafficId = 1;

        let nextY = startY;
        for (let index = 0; index < this.minimumAheadCount; index++) {
            const descriptor = this.#getNextDescriptor();
            nextY -= descriptor.gap;
            this.vehicles.push(this.#placeVehicle(descriptor, nextY));
        }
        return this.vehicles;
    }

    /**
     * 按调用方传入的有效测试车维护交通流。
     * 行驶方向朝向更小的 y，所以最小 y 是最前方，最大 y 是最后方。
     */
    maintain(relevantCars) {
        if (relevantCars.length === 0) return this.vehicles;

        const frontmostCarY = Math.min(...relevantCars.map(car => car.y));
        const rearmostCarY = Math.max(...relevantCars.map(car => car.y));

        const activeVehicles = [];
        for (const vehicle of this.vehicles) {
            if (vehicle.y > rearmostCarY + this.recycleBehindDistance) {
                this.pool.push(vehicle);
            } else {
                activeVehicles.push(vehicle);
            }
        }
        this.vehicles = activeVehicles;

        let trafficAheadCount = this.vehicles.filter(vehicle =>
            vehicle.y < frontmostCarY
        ).length;
        let frontmostTrafficY = Math.min(
            ...this.vehicles.map(vehicle => vehicle.y),
            frontmostCarY - this.recycleBehindDistance
        );

        while (trafficAheadCount < this.minimumAheadCount) {
            const descriptor = this.#getNextDescriptor();
            frontmostTrafficY -= descriptor.gap;
            this.vehicles.push(this.#placeVehicle(descriptor, frontmostTrafficY));
            trafficAheadCount++;
        }
        return this.vehicles;
    }

    getVehicles() {
        return this.vehicles;
    }

    getStats() {
        return {
            activeCount: this.vehicles.length,
            pooledCount: this.pool.length,
            generatedEventCount: this.nextTrafficId - 1
        };
    }

    #getNextDescriptor() {
        const descriptor = this.trafficPattern[
            this.patternIndex % this.trafficPattern.length
        ];
        this.patternIndex++;
        return descriptor;
    }

    #placeVehicle(descriptor, y) {
        const x = this.getLaneCenter(descriptor.lane);
        const vehicle = this.pool.pop() || this.createVehicle(x, y);
        vehicle.x = x;
        vehicle.y = y;
        vehicle.speed = 0;
        vehicle.angle = 0;
        vehicle.damaged = false;
        vehicle.trafficId = this.nextTrafficId++;

        // Car.update() 同时负责重建私有碰撞多边形；暂时关闭控制可避免放置时额外移动。
        vehicle.controls.forward = false;
        vehicle.controls.left = false;
        vehicle.controls.right = false;
        vehicle.controls.reverse = false;
        vehicle.update([], []);
        vehicle.controls.forward = true;
        return vehicle;
    }
}
