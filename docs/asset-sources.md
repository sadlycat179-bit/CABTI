# 当前猫咪素材清单

更新时间：2026-08-01

本表与 `src/data/config.js` 当前使用的 16 种结果猫格保持一致。结果页会同时使用 `assets/images/cats/profiles`、`assets/images/cats/gallery` 和 `assets/images/cats/stories` 中的照片；网页实际加载的是 `assets/images/generated` 中自动生成的响应式 WebP。

大佐、喇叭和蛋壳女王属于互动彩蛋素材，不占用结果猫格名额：

- 大佐：`assets/images/surprises/duo/surprise-dazuo.png`
- 喇叭：`assets/images/surprises/duo/surprise-laba.png`
- 蛋壳女王：`assets/images/surprises/danke-queen/danke-queen-royal.png`
- 蛋壳王座：`assets/images/surprises/danke-queen/danke-queen-throne.png`

## 结果页当前素材

| 代号 | 猫咪 | 当前文件 |
| --- | --- | --- |
| LOVE-U | 蛋挞 | `assets/images/cats/gallery/danta-new-1.webp`、`danta-new-2.webp`、`danta-new-3.webp`、`danta.jpg`；`assets/images/cats/profiles/love-u-danta.webp` |
| HIHI | 大夹子 | `assets/images/cats/profiles/hihi-dajiazi.webp` |
| SALT | 薄荷 | `assets/images/cats/gallery/bohe.jpg`；`assets/images/cats/profiles/salt-bohe.jpg` |
| CHIL | 笑笑 | `assets/images/cats/gallery/xiaoxiao.jpg`；`assets/images/cats/profiles/lyfe-xiaoxiao.webp` |
| EATR | 乌云 | `assets/images/cats/gallery/wuyun.jpg` |
| DEVIL | 四喜 | `assets/images/cats/profiles/free-sixi.jpg` |
| XXXL | 三宝 | `assets/images/cats/gallery/sanbao-1.jpg`、`sanbao-2.jpg`、`sanbao-3.jpg`；`assets/images/cats/profiles/xxxl-sanbao.jpg` |
| BOSS | 大逼斗 | `assets/images/cats/profiles/boss-dabidou.jpg` |
| SONG | 黛玉 | `assets/images/cats/gallery/daiyu-1.jpg`、`daiyu-2.jpg`；`assets/images/cats/profiles/song-daiyu.webp` |
| KISS | 左下角 | `assets/images/cats/gallery/zuoxiajiao-cover.jpg`；`assets/images/cats/profiles/kiss-zuoxiajiao.webp` |
| GLOW | 青桔 | `assets/images/cats/gallery/qingju.jpg`；`assets/images/cats/profiles/glow-qingju.jpg` |
| IDEA | 蛋黄 | `assets/images/cats/profiles/idea-danhuang.jpg` |
| IDOL | 饭包 | `assets/images/cats/gallery/fanbao.jpg` |
| DRINK | 养乐多 | `assets/images/cats/gallery/yangleduo-new.jpg` |
| LAMP | 桔子灯 | `assets/images/cats/gallery/juzideng-new.png` |
| RUNNER | 蛋饼 | `assets/images/cats/gallery/danbing.jpg`；`assets/images/cats/profiles/runer-danbing.jpg` |

## 已记录的公开来源

- 蛋挞：[小红书公开内容](https://www.xiaohongshu.com/explore/6a13fd060000000036019c82)
- 大夹子：[小红书公开内容](https://www.xiaohongshu.com/explore/6a131eb80000000038020584)
- 薄荷：[微信公众号文章](https://mp.weixin.qq.com/s/5_kQaNmWCy4BTkAnJU1lYQ)
- 笑笑：[小红书公开内容](https://www.xiaohongshu.com/explore/6a116fd0000000003601efdc)
- 蛋饼：[微信公众号文章](https://mp.weixin.qq.com/s/4vxXi5mg9UCpnp3meWhP9Q)
- 三宝：[抖音公开内容](https://www.douyin.com/video/7633757471785914438)
- 大逼斗：[微信公众号文章](https://mp.weixin.qq.com/s/qM7rVWUnfj0fIAunVTWqkw)
- 黛玉：[小红书公开内容](https://www.xiaohongshu.com/explore/6a24df7f0000000015027b25)
- 左下角：[小红书公开内容](https://www.xiaohongshu.com/explore/6a14056b000000003803491c)
- 青桔：[微信公众号文章](https://mp.weixin.qq.com/s/3GkibDaqij3V_tdHrFy1jw)
- 蛋黄：[微信公众号文章](https://mp.weixin.qq.com/s/ZiqAgDGFlTpC9UP9Li6VXQ)
- 四喜：[微信公众号文章](https://mp.weixin.qq.com/s/lG2cG2RB6TO6ccxeVD1EKw)
- 桔子灯：[小红书公开内容](https://www.xiaohongshu.com/explore/6a127f8100000000370358a7)

## 维护说明

- 结果页素材以 `src/data/config.js` 为准；修改后应同步更新本表。
- 不再保留未被页面引用的旧照片、总览拼图和 SVG 占位图。
- 新增或替换图片后运行 `python tools/images/generate_responsive_images.py`，更新响应式 WebP 和清单。
- 正式公开发布前，应由项目负责人确认图片转载与展示授权，并保留来源署名。
