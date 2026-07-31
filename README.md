# CATBTI 校园猫格测试

纯 HTML、CSS、JavaScript 的静态网站。浏览和部署无需安装依赖，同时兼容本地 `file://`、GitHub Pages 与 Netlify。

## 使用方法

直接双击 `index.html` 即可在浏览器中打开。部署到 GitHub Pages 时，将整个目录上传到仓库并启用 Pages。

可通过查询参数快速预览：

- `?result=LOVE-U`：预览指定猫格结果。
- `?result=LOVE-U&surprise=1`：强制显示双猫礼盒彩蛋。
- `?result=QUEEN`：预览 KISS 结果并测试蛋壳女王彩蛋。
- `?result=LOVE-U&transition=1&fate=hit`：测试骰子命中流程。
- `?result=LOVE-U&transition=1&fate=miss`：测试骰子未命中流程。

## 修改内容

- 全站文字、题目、选项、计分和猫咪资料位于 `config.js`。
- 页面结构位于 `index.html`，主要交互逻辑位于 `app.js`。
- 公共运行工具及彩蛋控制器位于 `scripts`。
- 样式按基础布局、结果页、动画和细节修正拆分在 `styles`。
- 原始猫咪图片位于 `images/real-cats`、`images/updated-cats` 和 `images/docx-update`。
- 音效位于 `audio`，文案草稿位于 `docs`。

## 图片加载与素材维护

网页使用分批加载与响应式 WebP：封面、结果轮播、图鉴和动画只会在需要时加载对应素材。

- 原始图片必须保留在 `images` 的非 `optimized` 目录中。
- `images/optimized` 是网页使用的多尺寸 WebP，不要手工编辑。
- `scripts/image-manifest.js` 是原图与 WebP 的映射清单。
- 新增、替换或删除图片后，需要重新运行：

```powershell
python tools/generate_responsive_images.py
```

生成工具需要 Python 和 Pillow；已经生成好的静态网站本身不需要 Python。

提交前应确认：

1. `config.js`、HTML、CSS 和脚本中没有失效的素材路径。
2. 不提交临时截图、重复音频或已经被真实照片替代的 SVG 占位图。
3. 至少测试封面、普通结算、图鉴、双猫礼盒、蛋壳女王及骰子成功/失败流程。

## 目录

```text
CATBTI/
├─ index.html             页面结构
├─ app.js                 测试与页面交互逻辑
├─ config.js              全站可编辑内容
├─ matcher.js             猫格匹配规则
├─ styles/                页面与动画样式
├─ scripts/               运行工具及动画控制器
├─ images/                原始图片和响应式 WebP
├─ audio/                 页面音效
├─ docs/                  文案与项目说明
├─ qa/                    自动检查脚本
└─ tools/                 图片生成工具
```
