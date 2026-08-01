# 测试指南

## 快速手动测试

打开 `index.html`，依次检查：

1. 首页圆盘、标题、按钮和随机猫咪探头。
2. 完整答题流程以及返回上一题。
3. 普通结果页轮播、文案和返回入口。
4. 猫咪图鉴、图鉴弹窗和故事配图。
5. 大佐、喇叭双猫礼盒彩蛋。
6. KISS 结果页的蛋壳女王彩蛋。
7. 命运骰子命中和未命中过渡。

## 快速地址

- `index.html?result=LOVE-U`
- `index.html?result=LOVE-U&surprise=1`
- `index.html?result=QUEEN`
- `index.html?result=LOVE-U&transition=1&fate=hit`
- `index.html?result=LOVE-U&transition=1&fate=miss`

注意：`?` 必须出现在 `index.html` 后面，不能被编码成 `%3F`。

## 自动检查

匹配规则：

```powershell
node tests/matching/matching-check.js
```

浏览器检查脚本位于 `tests/browser/`。这些脚本需要传入可用的 Playwright
环境或浏览器路径，具体参数以各脚本顶部说明为准。

## 重构后重点检查

- `index.html` 中所有 CSS 和脚本均成功加载。
- 控制台没有 404、JavaScript 错误或失效素材警告。
- `src/core/image-manifest.js` 的每个原图路径和生成图路径都存在。
- 桌面 hover 与手机 click 行为没有互相影响。
- 音频只在用户允许的交互时机播放。
