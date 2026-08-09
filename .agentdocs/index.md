# 项目文档索引

## 当前变更文档

- `workflow/20260809205627-remove-following-elimination.md` - 删除长期跟车检测、淘汰及面板统计，车辆仅因碰撞硬淘汰；维护当前筛选和淘汰规则时读取。
- `workflow/20260809203238-fix-zero-minimum-speed-semantics.md` - 修正最小速度 0 仍可倒车的问题，并保留交通车原有倒车下限；理解速度下限语义时读取。
- `workflow/20260809201329-add-minimum-test-car-speed.md` - 为测试车增加默认 0、可配置且随下一代生效的最小速度；调整训练车速度下限时读取。
- `workflow/20260809194712-manage-distance-experiment-with-worktree.md` - 将纯距离算法迁移到独立实验分支和 worktree，移除目录副本；维护多方案实验工作流时读取。
- `workflow/20260809193328-relocate-11-1-distance-experiment.md` - 将 11.1 移入第 11 阶段并按纯距离选择特点重命名；维护 11.x 探索版本结构时读取。
- `workflow/20260809192442-create-11-1-distance-branch.md` - 从第 11 阶段冻结出 11.1 纯距离训练分支，并隔离训练存储；进行评分方案对照或维护 11.1 时读取。
- `workflow/20260809182541-simplify-selection-by-distance.md` - 将综合积分简化为“存活优先、距离第二”，对齐第 9 阶段最远距离思路；理解当前选择规则时读取。
- `workflow/20260809175730-document-generation-main.md` - 为第 11 阶段 main.js 补充完整中文分区与算法注释；初次阅读或维护自动训练主流程时优先读取。
- `workflow/20260809165939-unify-elimination-penalty.md` - 将碰撞与长期跟车淘汰统一为一次性扣 5000 分，避免碰撞车辆凭小额惩罚成为冠军；维护淘汰评分时读取。
- `workflow/20260809164050-remove-following-score-penalty.md` - 删除持续跟车逐帧扣分，仅保留 300 帧硬淘汰和一次性惩罚；维护适应度时读取。
- `workflow/20260809162623-add-training-settings-panel.md` - 面板新增世代长度、车辆数和变异强度配置，下一代生效并持久化；调整训练规模时读取。
- `workflow/20260809160629-smooth-training-camera.md` - 为最佳车跟随镜头增加平滑和限速，消除无限交通训练中的画面抖动；维护渲染镜头时读取。
- `workflow/20260809155933-add-infinite-traffic.md` - 将固定 7 辆障碍改为循环回收的无限交通流；维护交通生成或无限训练时读取。
- `workflow/20260809154939-fix-alive-progress-stagnation.md` - 修复历史领先车损毁后误判整个种群停滞；成绩平台或异常提前换代时读取。
- `workflow/20260809153912-fix-following-detection-hysteresis.md` - 修复跟车计时被距离波动反复清零，加入滞回与延迟释放；排查未触发淘汰时读取。
- `workflow/20260809153507-eliminate-persistent-followers.md` - 连续跟车 300 帧后自动淘汰并扣分；维护跟车治理策略时读取。
- `workflow/20260809152935-penalize-prolonged-following.md` - 增加持续跟车识别、惩罚和超车统计，解决种群偏好跟车；调整适应度时读取。
- `workflow/20260809151449-fix-generation-transition-render.md` - 修复 1× 速度在换代瞬间画布变黑并停止；维护动画循环或世代边界时读取。
- `workflow/20260809150033-prevent-generation-stagnation.md` - 增加停滞检测和随机新个体，修复 1× 速度下换代后长期无动作；排查训练卡住时读取。
- `workflow/20260809145353-fix-generation-idle-convergence.md` - 修复第二代可能集体不动的问题；分析适应度设计或训练停滞时读取。
- `workflow/20260809144427-add-automated-generations.md` - 新增第 11 阶段完整自动 Generation 管理；需要理解或维护自动训练、评分、选择、交叉、变异及持久化时读取。
- `workflow/20260809084108-init-project-agentdocs.md` - 初始化项目协作文档，并记录项目启动方式。

## 关键记忆

- 第 11 阶段测试车最小速度默认是 0，可在面板设置为 0～3；设置为 0 时可停车但不能倒车，设置为正数时不能停车或倒车，参数在下一代生效并持久化，交通车不受影响。
- 纯距离算法位于 `experiment/11.1-pure-distance-selection` 分支，对应同级 worktree `self-driving-car-11.1-pure-distance-selection`；运行其中的 `11. Automated generations/index.html`。
- 项目没有包管理器和构建步骤，各课程阶段均可独立运行。
- 推荐从 `11. Automated generations/index.html` 体验自动化训练；原课程内容仍以第 9、10 阶段作为对应实验版本。
- 可直接打开 HTML，或在项目根目录运行 `python -m http.server 8000` 后通过浏览器访问。
- 第 11 阶段每代 100 辆车，最多运行 5000 帧；保留前 5 名精英，从前 10 名中选择亲本并交叉，其余个体使用 `0.1` 强度变异。
- 第 11 阶段使用独立的 `localStorage` 键 `selfDrivingCarGenerationStateV8`，不会覆盖第 9 阶段的 `bestBrain`；旧版综合积分不再加载。
- 第 11 阶段不奖励单纯存活时间，通过闲置惩罚避免不动车辆占据亲本池。
- 第 11 阶段连续 180 帧没有新增前进距离会自动换代，每代固定注入 10 个完全随机个体，避免坏亲本导致永久停滞。
- 第 11 阶段在换代发生于动画帧最后一步时，会在绘制前补一次模拟更新，避免绘制未初始化的新种群。
- 第 11 阶段已移除跟车检测与跟车淘汰；车辆只有碰撞道路或交通车时才会硬淘汰。
- 停滞计时由任意存活车辆每前进 1 像素刷新，已损毁车辆的历史最远位置不参与停滞判定。
- 第 11 阶段始终维护 10 辆交通车；落后领先 AI 超过 400 像素的车辆会回收到前方，使用新编号重复参与超车计分。
- 第 11 阶段镜头不再直接绑定实时最佳车坐标，而是使用 0.15 平滑系数和随模拟倍速调整的最大步长进行跟随。
- 第 11 阶段面板可设置下一代世代长度 500～50000 帧、车辆数 10～500、变异强度 0～1；应用后在换代时生效并保存到 V8 状态。
- 第 11 阶段不再使用综合积分：未淘汰车辆优先，状态相同时只比较前进距离；全员淘汰时选择其中跑得最远者。
- 第 11 阶段主流程源码按七个职责分区，函数级中文注释可直接作为规则和阅读入口。
