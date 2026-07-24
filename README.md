# CATBTI 校园猫人格测试

纯 HTML、CSS、JavaScript 的静态网站，无需安装任何工具。

## 使用方法

直接双击 `index.html` 即可在浏览器中打开。部署到 GitHub Pages 时，将整个目录上传到仓库并启用 Pages。

## 修改内容

- 所有站点文字、题目、选项、计分和猫咪资料都在 `config.js`。
- 猫咪图片放在 `images` 文件夹，替换图片后同步修改 `config.js` 中对应的 `image` 路径。
- 测试由 Social、Feeling、Lifestyle 三个维度计算；正分选择 `positive` 字母，负分选择 `negative` 字母，再通过 `resultMap` 映射到八种人格。

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
