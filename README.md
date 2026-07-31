# CATBTI 校园猫格测试

纯 HTML、CSS、JavaScript 的静态网站。无需安装前端依赖，同时兼容直接打开
`index.html`、GitHub Pages 与 Netlify。

## 快速使用

直接双击 `index.html` 即可打开。也可以启动任意静态文件服务器后访问项目根目录。

常用测试地址：

- `?result=LOVE-U`：预览指定猫格结果。
- `?result=LOVE-U&surprise=1`：强制显示大佐、喇叭礼盒彩蛋。
- `?result=QUEEN`：预览 KISS 结果并测试蛋壳女王彩蛋。
- `?result=LOVE-U&transition=1&fate=hit`：测试骰子命中流程。
- `?result=LOVE-U&transition=1&fate=miss`：测试骰子未命中流程。

## 从哪里修改

- 全站文案、题目、选项与猫咪资料：`src/data/config.js`
- 页面结构：`index.html`
- 页面协调与结果页逻辑：`src/app.js`
- 猫格匹配规则：`src/core/matcher.js`
- 封面、答题和彩蛋功能：`src/features/`
- 页面样式：`styles/`
- 原始图片与音频：`assets/`
- 文案、架构和维护说明：`docs/`
- 自动检查：`tests/`
- 图片和音频维护工具：`tools/`

## 目录结构

```text
CATBTI/
├─ index.html
├─ README.md
├─ src/
│  ├─ app.js
│  ├─ data/
│  ├─ core/
│  └─ features/
├─ styles/
│  ├─ foundation/
│  ├─ pages/
│  └─ effects/
├─ assets/
│  ├─ images/
│  │  ├─ cats/
│  │  ├─ cover/
│  │  ├─ surprises/
│  │  ├─ guides/
│  │  ├─ social/
│  │  ├─ ui/
│  │  └─ generated/
│  └─ audio/
│     ├─ interactions/
│     └─ transitions/
├─ docs/
├─ tests/
│  ├─ browser/
│  └─ matching/
└─ tools/
   ├─ images/
   └─ audio/
```

更完整的职责说明见 `docs/architecture.md`，素材规则见
`docs/asset-guide.md`，测试方法见 `docs/testing-guide.md`。

## 图片加载

页面会按使用阶段加载图片，并通过 `src/core/image-manifest.js` 将原图映射到
`assets/images/generated/` 中的多尺寸 WebP。

新增或替换图片后运行：

```powershell
python tools/images/generate_responsive_images.py
```

生成工具需要 Python 与 Pillow；网站运行本身不需要 Python。

## 提交前检查

1. 确认没有失效的图片、音频、样式或脚本路径。
2. 运行 `node tests/matching/matching-check.js`。
3. 测试封面、答题、普通结果、图鉴、双猫彩蛋、蛋壳女王和彩蛋骰子流程。
4. 不提交临时截图、重复音频或未被页面引用的占位素材。
