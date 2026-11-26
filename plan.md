# 果冻海 Jelly Sea — 开发计划

> 项目：正方形封闭式 Web3D 微缩生态沙盒
> 技术栈：Vue 3 + TypeScript + Vite + Three.js（WebGL2 + GLSL）+ GSAP
> 目标：桌面浏览器 60fps，兼具「远景果冻颗粒质感」与「近景生态细节」

---

## 1. 技术选型与关键决策

| 决策点 | 方案 | 理由 |
|---|---|---|
| 框架 | Vue 3 `<script setup>` + TS + Vite | PRD 指定；UI 逻辑轻量，无需 Pinia，用单例响应式 store |
| 3D | three.js（npm 依赖，锁定版本） | 官方 `OrbitControls` / `EffectComposer` / `UnrealBloomPass` 足够 |
| 相机控制 | OrbitControls（阻尼 + 距离/角度限制） | 天然满足左键旋转 / 滚轮缩放 / 右键平移 |
| 动画驱动 | 统一 `Ticker`（一个 `uTime` 共享给所有 shader + GSAP 相机补间） | PRD「统一的动画时间管理」；暂停即冻结时间 |
| 资源 | **全部程序化生成**（无外部模型/贴图） | 项目目录无美术资源；程序化可保证风格统一、包体小、无加载失败风险 |
| 果冻边界 | 自定义 `ShaderMaterial`（菲涅尔 + 噪波扰动 + 边缘辉光） | 比 `MeshPhysicalMaterial.transmission` 便宜且更可控 |
| 水面 | 自定义 `ShaderMaterial`（Gerstner 叠加 + 深度着色 + 焦散 + 浪花） | 需要基于地形深度的渐变与岸边浪花 |
| UI | 纯 Vue 组件 + CSS 玻璃拟态（玻璃面板、细线、荧光） | PRD 要求定制 UI；不使用 lil-gui 暴露到界面 |
| 后期 | Bloom（低强度）+ ACES 色调映射 + CSS 暗角 | PRD「避免过度使用 Bloom」 |
| 阴影 | 单方向光 2048 shadow map，仅主山/建筑/鲸鱼投射 | 控制开销 |

浏览器基线：支持 WebGL2 的桌面 Chrome/Edge/Safari。

---

## 2. 目录结构

```
1126/
├── index.html
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts
├── plan.md
├── README.md
└── src/
    ├── main.ts
    ├── App.vue
    ├── env.d.ts
    ├── styles/
    │   └── global.css
    ├── components/
    │   ├── TitleBar.vue          # 顶部标题
    │   ├── InfoPanel.vue         # 右侧生态状态面板
    │   ├── ControlBar.vue        # 底部视角/暂停/滑杆
    │   ├── SpeciesCard.vue       # 生物介绍弹卡
    │   ├── LoadingOverlay.vue    # 载入遮罩
    │   └── HudFrame.vue          # 四角装饰线 / 取景框
    ├── stores/
    │   └── useApp.ts             # UI 状态（视角、暂停、滑杆、选中的生物、统计）
    └── three/
        ├── JellySeaApp.ts        # 3D 应用入口（装配所有模块）
        ├── config.ts             # 尺寸常量、色板、视角预设、生物数据
        ├── core/
        │   ├── Engine.ts         # renderer / resize / RAF / FPS / 暂停
        │   ├── Ticker.ts         # 统一动画时钟
        │   ├── SceneManager.ts   # scene / 背景 / 雾
        │   ├── CameraManager.ts  # 相机 + OrbitControls + 视角补间
        │   ├── Lighting.ts       # 半球光 / 方向光 / 点光
        │   ├── PostProcessing.ts # Bloom / OutputPass
        │   ├── Resources.ts      # 几何体与材质缓存 + dispose
        │   └── Noise.ts          # 2D simplex + fBm + domain warp
        ├── materials/
        │   ├── JellyMaterial.ts  # 果冻外壳
        │   ├── WaterMaterial.ts  # 动态海水
        │   ├── CausticsMaterial.ts
        │   └── SwayMaterial.ts   # 给植物注入风摆动顶点代码
        ├── entities/
        │   ├── Sandbox.ts        # 正方形圆角果冻外壳 + 底座
        │   ├── Terrain.ts        # 海陆高度场、山体、海岸、海底
        │   ├── Ocean.ts          # 水面网格
        │   ├── Forest.ts         # 树木 / 灌木 / 草 / 花（Instanced）
        │   ├── Scenery.ts        # 小屋、栈桥、石桥、小路、溪流、岩石、晶体
        │   ├── Whale.ts          # 鲸鱼 + 游动路径
        │   ├── FishSchools.ts    # 鱼群（GPU 驱动）
        │   ├── Jellyfish.ts      # 水母（脉动 + 触须）
        │   ├── Seaweed.ts        # 海草（摆动）
        │   ├── SeaLife.ts        # 海龟 / 海星 / 虾蟹 / 发光浮游生物
        │   └── Particles.ts      # 景深粒子 + 气泡
        └── interaction/
            └── Interaction.ts    # Raycaster 拾取 / hover / 视角联动
```

---

## 3. 空间与坐标约定

```
沙盒：XZ 方向 ±20（边长 40），Y 从 -11（底座底）到 +11（壳顶）
水面：y = 0
海床：y ∈ [-7.5, -1.5]（近岸 -1.5，深海 -7.5）
主山：中心 (-7, -6)，峰顶 y ≈ +8.8
圆角：平面圆角半径 3，竖向倒角 1.2
```

- 地形为 40×40 的高度场（网格 200×200），XZ 不变形，只在 Y 上起伏。
- 陆地占西/北侧（-x, -z），海洋占东/南侧（+x, +z）；海岸线为一条斜向曲线，沙滩带宽约 2.5。
- 默认相机 `(34, 26, 34)` → `target (0,-1,0)`，fov 38，可同时看到山、海岸、水体侧面与底部厚度。

---

## 4. 核心模块设计

### 4.1 Engine / Ticker

- `Engine`：创建 `WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' })`，`outputColorSpace = SRGB`，`toneMapping = ACESFilmic`，`toneMappingExposure = 1.05`；DPR `min(devicePixelRatio, 1.75)`；resize 用 `ResizeObserver`；FPS 用 1s 滑窗统计，推送到 UI。
- `Ticker`：`elapsed`（可暂停）、`delta`（clamp ≤ 1/30）；向所有 shader 提供统一 `uTime`；`pause()/resume()` 期间 `elapsed` 不增长，但相机与 UI 仍可交互。
- 统一重建/释放：`Resources` 注册所有 geometry/material，卸载时 dispose。

### 4.2 Sandbox（PRD 最高优先级）

- 几何：`RoundedBoxGeometry(40, 22, 40, 6, 1.2)`（three/addons）作为外壳，或自建圆角矩形拉伸体；**禁止球体/圆柱罩**。
- `JellyMaterial`（ShaderMaterial, transparent, depthWrite:false, side: DoubleSide, blending: Normal）：
  - 菲涅尔：视线越掠射越亮，边缘 cyan → 蓝紫渐变；
  - 半透明：正面约 0.10 透明度，掠射 0.55，保证「能看进去」；
  - 内部噪波（fbm 3D）做缓慢流动的果冻纹理；
  - 边缘辉光：基于局部 UV 到边界距离叠加 `#66f2ff` 光带；
  - `uOpacity` 供「海底视角」时衰减外壳。
- 额外结构：
  - 底部厚板：两层半透明蓝晶材质（厚 1.6 + 0.6），带折射色 + 细小气泡粒子，体现「底部厚度」；
  - 四边棱线：`LineSegments` + 加法混合的青色细线（圆角矩形轮廓，上下各一圈 + 四根竖棱），是最直接的「正方形轮廓」识别；
  - 外壳 > 水面处不遮挡内部：外壳与水体 blend 顺序正确（外壳 `renderOrder` 最高，depthTest true）。

### 4.3 Terrain（山脉 + 陆地 + 海底）

- 高度场函数：`h = landMask * (mountain + hills + detail) + oceanBasin`
  - `landMask`：smoothstep 的斜向海岸线 + 噪声扰动；
  - `mountain`：径向高斯峰 + ridged fBm（山脊感），峰顶加晶体簇；
  - `detail`：fBm 小尺度起伏；
  - `oceanBasin`：向海侧平滑下潜至 -7.5，近岸 -1.5。
- 网格：`PlaneGeometry(40,40,200,200)` 旋转平铺，顶点写入 Y + 顶点色。
- 顶点色规则（按高度/坡度/水线）：
  - 海底深处 `#0b3552` → 浅海沙 `#cbb98a`；
  - 沙滩 `#e6d7a5`；草地 `#4fd18a`/`#79e6a8`（噪声混合）；陡坡岩石 `#6d7f95`；峰顶晶体附近泛白蓝。
- 法线重算 + 低强度草地细节；海底叠加 `CausticsMaterial`（动画焦散投影，加色混合的贴地片）。
- 主山：作为高度场一部分保证与陆地无缝衔接；另以 InstancedMesh 摆放岩石/晶体/小树。
- 山脚：湖泊（水面小平面 + 岸边浅滩顶点色）、溪流（沿等高线的细 ribbon 带 + 流动 shader）。
- 交互标记：山脉与海洋用不可见拾取体（低面数代理）挂到 `Interaction`。

### 4.4 Ocean（动态海水）

- `PlaneGeometry(40,40,128,128)` @ y=0，`WaterMaterial`：
  - 顶点：3 组 Gerstner 波（振幅 0.06~0.12，波长 6/3/1.6，方向不同）；
  - 片元：`depth = -terrainHeight(xz)`（构建时作为属性传入）→ 浅海 `#35c9d0` 半透明、深海 `#062a4e` 更深；
  - 菲涅尔调制透明度（正视 0.55，掠射 0.9）；
  - 太阳高光 + 流动焦散纹路 + 岸边白色浪花（depth < 0.6 处随时间脉动的 foam 带）；
  - 不写深度、`transparent`，保证水下生物可见。
- 水下体积光：视锥内若干加法混合的柔光面片（`ShaderMaterial` 渐变），随相机轻微视差。
- 提供 `uOpacity` 滑杆接口。

### 4.5 Forest / Scenery

- 树：`InstancedMesh`（树干圆柱 + 2~3 层锥体/二十面体树冠合并为一个 geometry，每实例不同缩放/旋转/色相）；约 70 棵，分布于山坡、山脚、平原。
- 灌木 ~50、草丛 ~700（十字交叉面片，实例化）、花 ~180（小面片 + 微自发光）、岩石 ~60（二十面体压扁）。
- 风摆动：`SwayMaterial.onBeforeCompile` 注入顶点位移 `sin(time + instancePhase + worldPos)`，顶部权重按 Y 渐变，幅度小（<3°）。
- 景观：小木屋（box + 屋顶 + 暖光点）、木质观景台、石桥、石板小路（Catmull-Rom 曲线 ribbon）、海边礁石。
- 全部使用共享 geometry/material；重复物体一律 InstancedMesh。

### 4.6 Marine Life

- **鲸鱼**：程序化体（胶囊拉伸 + 尾鳍 + 胸鳍 + 眼），深蓝灰渐变 + 腹部浅色；顶点 shader 沿身体轴轻微波动，尾鳍摆动幅度最大；Catmull-Rom 闭合路径（海区椭圆 + 深度起伏）慢速游动（约 40s/圈），朝向沿切线；缓慢上下浮动。为海洋区视觉主体，长度 ~7。参与点击拾取 → 弹出「蓝鲸」介绍。
- **鱼群**：3 群 × 24 条，`InstancedMesh` + 实例属性（中心、半径、相位、速度、尺寸、颜色）；位置在**顶点 shader 内**按轨道 + 噪声计算（CPU 零开销），尾部抖动由 shader 完成；分布在不同深度与海域。鱼群色：青绿 / 淡紫 / 亮金。
- **水母**：6 只；伞盖用半球 + 自定义 shader 脉动（缩放 + 边缘透明度），触须为细长面片/线段，绕伞盖轻摆；淡蓝/淡紫/青色半透明 + 微发光；上下漂浮。点击拾取 → 弹出「幻彩水母」介绍。
- **海龟** 1 只（缓慢绕游）、海星 ~12（海底）、虾蟹若干、发光浮游生物（粒子簇，靠近水母/海草）。
- **海草**：~140 个实例（细长面片），按高度加权摆动，跟随「水流」相位。

### 4.7 Particles（果冻颗粒核心）

- **空间粒子**：`THREE.Points`，默认 6000（滑杆 2000–12000 动态重建/按需伸缩），随机分布于沙盒内部体积；属性：大小(0.02–0.12)、色相（蓝/青/淡紫）、闪烁相位、漂移速度。
  - 顶点 shader：缓速漂浮 + 呼吸式闪烁 + 近大远小；
  - 片元：程序化圆形软边 + 内部高光点（模拟晶体/气泡的折射高光），`AdditiveBlending`，低亮度；
  - 避让：在鲸鱼/水母/山体包围球内降低密度（构建时剔除），且粒子不写深度、透明度低，不遮挡主体；
  - 远近策略：相机距离远时增大整体透明度与平均粒径（更「果冻」），近时更小更散 → 由 uniform 控制，避免重建。
- **气泡**：~260 个 Points/Instanced 小球，从海床随机点持续上升，到水面消失并复位；水母/海草附近成簇。
- **中近景晶体颗粒**：~120 个 `InstancedMesh` 小八面体，缓慢自转，低透明度玻璃质感。
- 沙盒外壳内部额外一层「贴边颗粒」弱化玻璃感。

### 4.8 Lighting

- `HemisphereLight(#bfeaff, #0a2a4a, 1.0)` 主环境；
- `DirectionalLight(#e8fbff, 1.8)` 自 (18,32,14)，2048 shadow map，范围覆盖沙盒，`bias -0.0005`；
- 点光：山脚暖光（小屋内 `#ffd28a`）、海底青色补光、水母群处淡紫光，均低强度；
- 水下用雾效（相机进入水下时启用 `FogExp2(#0a4a6b, 0.035)`）营造体积感；
- 焦散：贴海底的动画纹理片 + 水面临近水底的加色光斑。

### 4.9 Camera & Views

| 预设 | 位置 | 目标 |
|---|---|---|
| overview 远景 | (34, 26, 34) | (0, -1, 0) |
| land 陆地 | (22, 13, 20) | (-7, 3.5, -6) |
| ocean 海洋 | (26, 9, 24) | (10, -1.5, 8) |
| underwater 海底 | (5, -4, 12) | (11, -3, 3) |

- GSAP `power2.inOut` 1.6s 补间（position + target 同时补，期间锁 OrbitControls）。
- 限制：距离 24–100，极角 10°–82°，禁止穿入沙盒底部；进入水下时外壳 `uOpacity` 降至 0.15、开启水下雾、Bloom 略升。
- 窗口 resize 重新计算 aspect 与 bounds。

### 4.10 Interaction

- `Raycaster`（pointerup 且未拖动时触发），拾取优先级：生物（鲸鱼、水母）> 山脉 > 海洋 > 其他。
- hover：可拾取对象 cursor 变 pointer，轻微描边（emissive 提升）。
- 点击鲸鱼/水母 → `SpeciesCard` 展示中英文名、介绍、数据；
- 点击山脉 → 切换 land 视角；点击水面/海底 → 切换 underwater 视角；
- 键盘：空格暂停/继续、1-4 切换视角（额外便利，不打扰主 UI）。

### 4.11 UI（Vue）

- **TitleBar**：`JELLY SEA`（宽字距、渐变字）+「果冻海 · 微型生态世界」+ 副标题「探索一片藏在果冻中的海洋宇宙」；左上角小尺寸果冻 SVG 徽标。
- **InfoPanel**（右侧）：生态状态（运行中/已暂停）、海洋区域、陆地区域、生物数量（鲸 1 / 鱼 72 / 水母 6）、粒子数量（实时）、FPS。
- **ControlBar**（底部）：远景 / 陆地 / 海洋 / 海底 四个视角按钮、暂停/播放、三个滑杆（粒子密度、海水透明度、环境光强度）。
- **SpeciesCard**：玻璃卡 + 顶部渐变条 + 关闭按钮，显示物种名、描述、习性标签。
- **LoadingOverlay**：构建阶段进度条（0→100），全部模块 init 完成后淡出。
- 统一样式：`backdrop-filter: blur(18px)`、`rgba(8,30,52,.35)` 底、1px `rgba(102,242,255,.25)` 边、青色荧光点、圆角 14px、轻噪点。移动端不重点适配，但保证不破版。

---

## 5. 视觉规范

色板：

```
夜空背景   #030b18 → #061726（径向渐变 + 远景星点）
果冻外壳   #3fa9ff / #66f2ff 边光 / 内面淡紫 #b48cff
海水       #062a4e(深) → #0a5f8f → #35c9d0(浅)
植物       #4fd18a / #79e6a8 / 青绿 #3fe0b0
沙滩       #e6d7a5      岩石 #6d7f95      雪/晶体 #e8f7ff
荧光点缀   #66f2ff(青)  #b48cff(紫)  #ffd28a(暖)
```

质感原则：低饱和、高亮度边缘光、半透明层次、柔和对比。文字 `#dff6ff` / 次级 `rgba(200,235,255,.55)`。字体使用系统无衬线 + 宽字距（不依赖外网字体）。

---

## 6. 分阶段实施（对应 PRD 第十一节）

### Phase 0 — 工程脚手架（先行）
- [x] Vite + Vue3 + TS 初始化，安装 three / gsap（@types/three 内置类型）
- [x] `App.vue` 挂载 canvas、`JellySeaApp` 生命周期（mounted / 卸载销毁）
- [x] 全局样式、背景渐变、加载层骨架
- 验收：`npm run dev` 出现空场景 + 标题，无控制台报错

### Phase 1 — 空间与构图（PRD 第一阶段）
- [x] Engine / SceneManager / CameraManager / Lighting
- [x] 正方形圆角果冻外壳 + 底座 + 发光棱线
- [x] 高度场地形：主山、丘陵、草地、沙滩、海岸线、海底盆地
- [x] 树木 / 森林 / 灌木 / 草（Instanced + 风摆）
- [x] 水面 shader 初版（波动 + 深度渐变）
- [x] 默认 3/4 视角、OrbitControls 基础限制
- 验收：第一眼即是一个完整、精致的正方形海陆生态世界

### Phase 2 — 果冻视觉（PRD 第二阶段）
- [x] 果冻外壳材质完善（菲涅尔、内部噪波、边缘光、外壳不遮挡）
- [x] 水体透明/折射感、岸边浪花、浅滩底色、水下体积光
- [x] 焦散投影到海床
- [x] 空间颗粒系统（远景颗粒质感）+ 气泡系统 + 晶粒 InstancedMesh
- [x] Bloom 参数调优，避免过曝
- 验收：远景截图呈晶莹剔透、细腻颗粒的蓝色果冻质感

### Phase 3 — 生态动画（PRD 第三阶段）
- [x] 鲸鱼建模 + 路径游动 + 尾鳍摆动
- [x] 鱼群 GPU 游动（3 群）
- [x] 水母脉动 + 触须 + 漂浮
- [x] 海草/树木摆动、气泡上升、粒子漂浮闪烁
- [x] 海龟、海星、虾蟹、发光浮游生物
- 验收：所有主要生物与环境元素持续自然运动

### Phase 4 — 交互 / UI / 性能（PRD 第四阶段）
- [x] 视角预设 + 平滑过渡 + 水下模式（外壳淡出、雾效）
- [x] 点击鲸鱼/水母弹卡；点击山脉/海洋切换视角
- [x] UI 面板（标题、状态、控制栏、滑杆、暂停）
- [x] 性能：DPR 上限、自适应降级（FPS<45 时降 DPR/Bloom/粒子）、draw call 控制、dispose
- [x] 窗口缩放、页面隐藏时暂停渲染
- 验收：交互自然、持续流畅

### Phase 5 — 打磨与验收
- [x] 多视角截图走查（远景/陆地/海洋/海底/贴边）
- [x] 对照 PRD §12 十二条逐项验收
- [x] `npm run build` 通过，产物可 `vite preview` 正常打开
- [x] README：启动方式、结构说明、性能说明

---

## 7. 性能预算与质量门禁

| 指标 | 目标 |
|---|---|
| 帧率 | 桌面 1080p ≥ 55fps（默认画质） |
| Draw calls | < 120 |
| 三角形 | < 600k |
| 粒子 | 默认 6000，范围 2000–12000（自适应） |
| 纹理上传 | 0 外部贴图（全程序化） |
| 内存 | 切换视角/暂停无增长；卸载后 dispose 干净 |
| 每帧分配 | 主循环内无 `new` Geometry/Material/Vector3 临时对象 |

实现要点：InstancedMesh 复用、顶点着色器承担大量运动计算、`frustumCulled` 保留默认、按距离调粒子亮度/尺寸、DPR 上限 1.75、shadow map 2048（可降到 1024）、页面 `visibilitychange` 暂停 RAF。

---

## 8. 验收对照（PRD §12）

| # | 要求 | 实现 | 验证方式 |
|---|---|---|---|
| 1 | 正方形封闭沙盒，非球形 | RoundedBox 外壳 + 棱线 + 底座 | 远景截图 |
| 2 | 同时有陆地与海洋 | 高度场斜向海岸线 | 远景截图 |
| 3 | 明显主山 + 山上树木 | 径向峰 + ridged fBm + 山坡树 | 陆地视角截图 |
| 4 | 山脚森林、草地、其他场景 | Forest + Scenery（小屋/栈桥/桥/溪流/湖） | 陆地视角截图 |
| 5 | 动态水面 + 水下生态 | WaterMaterial + 海床/珊瑚/海草/礁石 | 海洋视角截图 |
| 6 | 动态大型鲸鱼 | Whale 路径游动 | 连续两帧位置对比 |
| 7 | 鱼群/水母/珊瑚/海草 | FishSchools / Jellyfish / 珊瑚簇 / Seaweed | 截图 + 交互 |
| 8 | 果冻颗粒 + 气泡 | Particles + Bubbles + 晶粒 | 远景/近景截图 |
| 9 | 远景晶莹果冻质感 | 外壳菲涅尔 + 颗粒 + Bloom | 远景截图 |
| 10 | 近景生态细节 | 树木/花/生物/建筑细节 | 近景截图 |
| 11 | 整体动态 | Ticker 驱动全场景 | 观察 |
| 12 | 高品质 Web3D | 构图、光照、材质、后期综合 | 人工评审 |

---

## 9. 风险与对策

| 风险 | 对策 |
|---|---|
| 透明外壳与水体渲染排序错乱 | 明确 renderOrder + depthWrite 策略；外壳最后渲染 |
| 传输材质（transmission）开销大 | 改用自定义菲涅尔 ShaderMaterial |
| Bloom 导致过曝 | 低强度（0.35~0.5）+ 高阈值 + ACES 映射，仅晶体/水母/边光发光 |
| 高度场与山体拼接出现接缝 | 山体作为高度场的一部分统一生成，不叠加独立模型 |
| 鱼群/粒子 CPU 开销 | 运动放在顶点着色器，CPU 只更新少量 uniform |
| 射线拾取命中透明外壳 | 外壳/粒子 `raycast = empty`，仅为生物与代理体启用拾取 |
| 水下视角被外壳遮挡/穿帮 | 进入水下时外壳淡出 + 水下雾 + 近裁剪面调小 |
| 缩放穿透沙盒 | OrbitControls `minDistance` + 目标点约束 |

---

## 10. 交付物

1. 可运行的 Vite 工程（`npm install && npm run dev`）。
2. 模块化源码（上述目录结构）。
3. `plan.md`（本文件）+ `README.md`（启动/结构/性能说明）。
4. `npm run build` 可通过，`dist/` 可直接部署静态托管。
5. 多视角验收截图（远景 / 陆地 / 海洋 / 海底）。


---

## 11. 实施记录（最终交付）

Phase 0–5 已全部完成，`npm run typecheck` 与 `npm run build` 均通过，并用真实浏览器走查了远景 / 陆地 / 海洋 / 海底四个视角。

**最终落地参数**

- 沙盒：40 × 22 × 40，圆角 3，外壳圆角 1.15；水面 y=0；海床 -7.4；主峰约 +8.5。
- 相机预设：远景 (38, 27, 38) → (0, -1, 0)；陆地 (18, 12, 18) → (-5, 3.4, -6.5)；海洋 (27, 10, 25) → (9.5, -1.5, 8)；海底 (0.5, -1.7, 17.5) → (12, -3.4, 8.5)。
- 生物：1 鲸鱼 + 78 鱼（3 群）+ 6 水母 + 1 海龟 + 4 螃蟹 + 10 海星，共 100。
- 场景：48 棵树 + 46 灌木 + 720 草丛 + 140 花 + 46 陆地岩石 + 300 海草 + 珊瑚/礁石。
- 粒子：默认 5,000（可调约 2,000–10,000），气泡 280，晶体 90，发光浮游 240。

**与初版计划的差异（均为实现期优化）**

1. 未使用 lil-gui，改为完全定制的 Vue 玻璃拟态控制栏，满足 PRD「简洁、不走样」的 UI 要求。
2. 果冻外壳采用 `BackSide` 渲染内壁：从外部观察时不再被近侧壁遮挡；底部保留三层果冻厚板与悬浮光晕。
3. 水面加入菲涅尔天空反光与波峰高光，解决俯视时水面「看不见」的问题。
4. 鱼群运动完全由顶点着色器驱动（InstancedBufferGeometry），CPU 每帧零更新。
5. 后期渲染目标固定为 CSS 像素分辨率，DPR 上限 1.5；本机环境刷新率上限约 25 Hz，帧率读数随刷新率，场景并非瓶颈。
6. 石桥按小路与溪流交点切向重建，改为石质桥面 + 石栏 + 石墩。

**交互验收结果**

- 点击鲸鱼 / 水母 → 物种档案卡正常弹出，Esc / 关闭按钮可关闭；
- 点击主山 → 陆地视角；点击海面 → 海底视角；
- 暂停冻结全部动画（鲸鱼位置不变），恢复后继续；
- 粒子密度 / 海水透明度 / 环境光强度滑杆实时生效；
- 左键拖动旋转、滚轮缩放均正常，拖拽不会误触发点击；
- 无控制台错误，窗口 resize 与窄屏布局正常。
