# 素材维护指南

## 图片分类

- `assets/images/cats/profiles/`：每种猫格的主要档案照片。
- `assets/images/cats/gallery/`：结果页和图鉴使用的补充照片。
- `assets/images/cats/stories/`：猫咪小传中的故事配图。
- `assets/images/cover/`：首页圆盘和探头素材。
- `assets/images/surprises/`：左下角、双猫和蛋壳女王彩蛋。
- `assets/images/guides/`：新生指引等辅助内容。
- `assets/images/social/`：公众号、抖音和小红书素材。
- `assets/images/ui/`：按钮与界面装饰图片。
- `assets/images/generated/`：工具生成的响应式 WebP。

`generated` 中的图片不要手工修改。它的子目录会镜像原始素材的分类。

## 音频分类

- `assets/audio/interactions/`：点击猫咪时播放的互动音效。
- `assets/audio/transitions/`：骰子等页面过渡音乐。

## 新增图片

1. 将原图放入对应的非 `generated` 目录。
2. 在 `src/data/config.js`、`index.html` 或功能脚本中引用原图路径。
3. 运行 `python tools/images/generate_responsive_images.py`。
4. 确认 `src/core/image-manifest.js` 中出现对应映射。
5. 在桌面和手机尺寸下检查清晰度、裁切和加载时机。

## 命名规则

- 使用小写英文和连字符，例如 `dazuo-gift-box.png`。
- 猫格主要照片可使用 `代号-猫名`，例如 `love-u-danta.webp`。
- 同一猫咪的补充照片使用稳定序号，例如 `sanbao-1.jpg`。
- 不再使用 `new`、`updated`、`final`、`docx-update` 等开发过程命名创建新目录。

图片公开来源与授权备注统一维护在 `docs/asset-sources.md`。
