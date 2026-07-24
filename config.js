/*
 * CATBTI 全站配置
 * 修改文字、题目、计分或猫咪资料，只需编辑本文件。
 * 每道题的 score 格式为：{ 维度名: 分值 }，正分偏向 positive，负分偏向 negative。
 */
window.CATBTI_CONFIG = {
  site: {
    name: "CATBTI",
    shortName: "CATBTI",
    intro: "你最像HBUT哪只猫",
    startButton: "开始寻找我的猫格",
    testNote: "跟随第一直觉作答，就会遇见最像你的那只猫。",
    resultEyebrow: "你的 CATBTI 测试结果",
    claimNotice: "欢迎向工作人员展示本页面领取对应炫酷猫格卡。",
    retryButton: "重新测试",
  dimensions: {
    Social: { positive: "S", negative: "A", label: "社交能量" },
    Feeling: { positive: "F", negative: "D", label: "感知方式" },
    Lifestyle: { positive: "L", negative: "P", label: "生活节奏" }
  },

  questions: [
    {
      text: "如果你的对象变成一只苍蝇，又不小心飞进了你的嘴里，你已经快咽下去了",
      hint: "传说中你为爱甘愿被搁浅",
      options: [
        { text: "等等！这是我对象！我要想办法救TA！", icon: "☀", score: { Social: 2 } },
        { text: "......但从生理角度来说，我已经吞下去了", icon: "☁", score: { Social: -2 } }
      ]
    },
    {
      text: "如果你的手机突然开始替你回复消息，而且每次都比你回复得更好",
      hint: "社交外包",
      options: [
        { text: "虽然这很棒，但是亲近的人的信息我还是会亲自回复", icon: "♥", score: { Feeling: 2 } },
        { text: "欧坤呀我也是直接撒手不管啦！", icon: "⌁", score: { Feeling: -2 } }
      ]
    },
    {
      text: "面对没有安排的周末，你的理想状态是……",
      hint: "两天空白时间",
      options: [
        { text: "随心走，醒来再决定今天去哪", icon: "~", score: { Lifestyle: 2 } },
        { text: "提前列好清单，把想做的都安排上", icon: "✓", score: { Lifestyle: -2 } }
      ]
    },
    {
      text: "在一个谁也不认识的新社团里，你通常……",
      hint: "门已经推开，大家都在聊天。",
      options: [
        { text: "主动找话题，很快就能混个脸熟", icon: "✦", score: { Social: 2 } },
        { text: "先观察氛围，等别人来和我说话", icon: "◐", score: { Social: -2 } }
      ]
    },
    {
      text: "你更容易被以下哪个打动？",
      hint: "每个人心里都有柔软的地方",
      options: [
        { text: "命运你假糍粑", icon: "♡", score: { Feeling: 2 } },
        { text: "大狗大狗叫叫叫", icon: "□", score: { Feeling: -2 } }
      ]
    },
    {
      text: "出门前发现天气预报变了，你会……",
      hint: "窗外的云看起来有点可疑。",
      options: [
        { text: "问题不大，到了再随机应变", icon: "↝", score: { Lifestyle: 2 } },
        { text: "马上调整路线和随身物品", icon: "☂", score: { Lifestyle: -2 } }
      ]
    },
    {
      text: "食堂遇到很想认识的同学，你会选择……",
      hint: "端着餐盘的你们正好对上视线。",
      options: [
        { text: "自然地坐到附近，找机会聊两句", icon: "☺", score: { Social: 2 } },
        { text: "默默记住，下次有合适机会再说", icon: "…", score: { Social: -2 } }
      ]
    },
    {
      text: "小组讨论出现分歧时，你更在意……",
      hint: "两种方案各有支持者。",
      options: [
        { text: "每个人的感受有没有被照顾到", icon: "◎", score: { Feeling: 2 } },
        { text: "哪个方案的逻辑和效率更高", icon: "△", score: { Feeling: -2 } }
      ]
    },
    {
      text: "假期旅行对你来说，最舒服的是……",
      hint: "一张车票，可以通往很多地方。",
      options: [
        { text: "保留空白，让惊喜在路上发生", icon: "✿", score: { Lifestyle: 2 } },
        { text: "攻略齐全，热门地点一个不漏", icon: "⌖", score: { Lifestyle: -2 } }
      ]
    },
    {
      text: "热闹活动结束后，你会怎样恢复电量？",
      hint: "夜色安静下来，校园灯还亮着。",
      options: [
        { text: "拉上朋友续摊，快乐还没结束", icon: "♪", score: { Social: 2 } },
        { text: "回到自己的角落，享受安静时间", icon: "◒", score: { Social: -2 } }
      ]
    },
    {
      text: "收到一份不太实用但很用心的礼物，你会……",
      hint: "包装纸上还有手写的小猫。",
      options: [
        { text: "因为这份心意而认真珍藏", icon: "❀", score: { Feeling: 2 } },
        { text: "感谢对方，也会想它能用在哪里", icon: "◇", score: { Feeling: -2 } }
      ]
    },
    {
      text: "考试周突然多出半天空闲，你第一反应是……",
      hint: "意外掉落的自由时间。",
      options: [
        { text: "先奖励自己，想做什么就做什么", icon: "☆", score: { Lifestyle: 2 } },
        { text: "重新排计划，把之后的任务提前", icon: "▤", score: { Lifestyle: -2 } }
      ]
    }
  ],

  /* 三个字母依次对应 Social、Feeling、Lifestyle 的测试结果。 */
  resultMap: {
    SFL: "LOVE",
    SFP: "HIHI",
    SDL: "LYFE",
    SDP: "BOSS",
    AFL: "SALT",
    AFP: "RUNR",
    ADL: "EATR",
    ADP: "XXXL"
  },

  cats: [
    {
      type: "LOVE", name: "蛋挞", title: "咪爱你", image: "images/love-danta.svg",
      introduction: "蛋挞是校园里流动的小太阳。它记得每个熟悉的脚步声，也总能第一时间察觉谁需要陪伴。对它来说，喜欢就要大方表达，温柔也应该有回音。",
      keywords: ["真诚", "共情", "热烈", "治愈"],
      quote: "你的心里住着一小块永不打烊的暖阳。被你认真喜欢过，是一件很幸运的事。"
    },
    {
      type: "HIHI", name: "大夹子", title: "热情小咪", image: "images/hihi-dajiazi.svg",
      introduction: "大夹子是社交场上的气氛担当，永远对新鲜的人和事充满兴趣。它行动利落、表达直接，走到哪里都能迅速召集一群快乐伙伴。",
      keywords: ["外向", "爽快", "行动派", "感染力"],
      quote: "你无需刻意发光，向前奔跑时扬起的风，就足以让平凡的一天变得热闹。"
    },
    {
      type: "SALT", name: "薄荷", title: "盐系老头", image: "images/salt-bohe.svg",
      introduction: "薄荷安静、细腻，拥有清清爽爽的边界感。它不轻易靠近，却会把认定的人放进柔软的心里，在不动声色处给予长久陪伴。",
      keywords: ["细腻", "克制", "慢热", "长情"],
      quote: "你不是冷淡，只是把温柔藏得很深。懂你的人，会在安静里听见你的认真。"
    },
    {
      type: "LYFE", name: "笑笑", title: "躺平老奶", image: "images/lyfe-xiaoxiao.svg",
      introduction: "笑笑深谙松弛之道。它喜欢热闹，也懂得随时给自己放个小假。计划可以改变，烦恼可以等等，舒服地活在当下才是头等大事。",
      keywords: ["松弛", "乐观", "随性", "好相处"],
      quote: "你有一种让生活慢下来的天赋。世界催得再急，也别忘了给自己晒太阳的时间。"
    },
    {
      type: "EATR", name: "乌云", title: "吞噬者", image: "images/eatr-wuyun.svg",
      introduction: "乌云拥有冷静敏锐的观察力，习惯先看懂世界，再决定如何出手。它珍惜自己的能量，对真正感兴趣的事却能投入惊人的专注。",
      keywords: ["冷静", "敏锐", "专注", "神秘"],
      quote: "沉默不是空白，而是你正在消化整个世界。你的深度，本就不必向所有人解释。"
    },
    {
      type: "RUNR", name: "蛋饼", title: "跑男", image: "images/runr-danbing.svg",
      introduction: "蛋饼有自己的路线和节奏。看似安静，认准目标后却比谁都坚定。它喜欢把事情稳稳做好，再悄悄奔向下一个想去的地方。",
      keywords: ["独立", "坚定", "可靠", "有韧性"],
      quote: "你不需要跟上别人的时钟。沿着自己的路线前进，每一步都算数。"
    },
    {
      type: "XXXL", name: "三宝", title: "大卡车", image: "images/xxxl-sanbao.svg",
      introduction: "三宝沉稳务实，喜欢秩序清晰、心里有底的生活。它很少被外界打乱节奏，总能把重要的事情妥帖接住，是让人安心的存在。",
      keywords: ["沉稳", "务实", "自洽", "安全感"],
      quote: "你的稳定不是无趣，而是一种珍贵的笃定。慢慢来，也能把日子过得很有分量。"
    },
    {
      type: "BOSS", name: "大逼斗", title: "老大", image: "images/boss-dabidou.svg",
      introduction: "大逼斗天生有主见，既能镇住场面，也懂得照顾自己的地盘。它判断果断、执行清晰，遇到问题从不绕路，是可靠的领头猫。",
      keywords: ["果断", "清醒", "领导力", "守护欲"],
      quote: "你知道自己要什么，也有能力守护在意的一切。真正的底气，从来不需要高声证明。"
    }
  ]
};
