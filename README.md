# CATBTI 校园猫格测试

纯 HTML、CSS、JavaScript 的静态网站，无需安装任何工具。

## 使用方法

直接双击 `index.html` 即可在浏览器中打开。部署到 GitHub Pages 时，将整个目录上传到仓库并启用 Pages。

## 修改内容

- 所有站点文字、题目、选项、计分和猫咪资料都在 `config.js`。
- 猫咪图片放在 `images` 文件夹，替换图片后同步修改 `config.js` 中对应的 `image` 路径。
- 测试由 Energy、Perception、Decision、Lifestyle 四个维度计算；四个结果字母组成 MBTI 参考型，再通过 `resultMap` 映射到 16 种 CATBTI 猫格。
- 最终结果页使用 `images/real-cats` 和 `images/updated-cats` 中的真实校园猫照片；大佐使用 `images/gent-dazuo.png` 透明底素材。
- `config.js` 中每只猫分别维护“猫咪小传”“你可能是”“关键词”和“给你的话”。
- 当前题库为 20 题，每个 MBTI 维度各 5 题，减少维度平分带来的结果偏向。
- 结算页底部集中展示鸣谢、交流群、公众号二维码和猫协招新说明。

## 目录

```text
CATBTI/
├─ index.html       页面结构
├─ style.css        视觉样式与响应式布局
├─ app.js           测试与页面交互逻辑
├─ config.js        全站可编辑内容
├─ README.md        使用说明
└─ images/          猫咪图片
```
