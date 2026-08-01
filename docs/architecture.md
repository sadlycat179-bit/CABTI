# CATBTI 项目结构

## 设计原则

CATBTI 保持零构建静态网站结构，不依赖 npm 或打包器。所有脚本使用普通
`<script>` 标签按顺序加载，因此可以直接通过 `file://` 打开，也可以部署到
GitHub Pages 或 Netlify。

## 程序目录

### `src/data`

存放可由内容编辑者维护的数据。

- `config.js`：站点文案、题目、选项、猫咪资料、图集和故事内容。

### `src/core`

存放不属于单一页面功能的基础能力。

- `matcher.js`：根据答题结果匹配猫格。
- `runtime.js`：图片延迟加载、空闲任务与通用运行工具。
- `image-manifest.js`：原图与响应式 WebP 的自动生成映射。

### `src/features`

存放可以独立理解和维护的页面功能。

- `cover-peek.js`：封面大佐、喇叭随机探头。
- `quiz.js`：题目流程、答案状态和结果计算。
- `effects/fate-transition.js`：命运骰子过渡。
- `effects/duo-surprise.js`：大佐、喇叭礼盒彩蛋。
- `effects/danke-queen.js`：蛋壳女王彩蛋。

### `src/app.js`

负责页面切换、结果页渲染、猫咪图鉴、音效初始化和各功能控制器的组装。
它是协调入口，不再保存封面探头和答题流程的内部状态。

## 样式目录

- `styles/foundation/`：全站基础布局和响应式修正。
- `styles/pages/`：结果页、图鉴和页面级样式。
- `styles/effects/`：动画、粒子和彩蛋视觉样式。

## 加载顺序

`index.html` 中的脚本顺序不可随意颠倒：

1. 数据配置与匹配规则。
2. 图片清单与运行工具。
3. 功能控制器。
4. 彩蛋控制器。
5. `src/app.js` 页面入口。

功能文件通过 `window.CATBTI_FEATURES` 或 `window.CATBTI_EFFECTS` 暴露工厂函数，
避免引入会破坏本地 `file://` 兼容性的 ES Module。
