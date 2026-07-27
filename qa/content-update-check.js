const { chromium } = require(process.argv[2]);

(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const expected = {
    XXXL: { quote: "白袜、围脖、大圆脸，我叫三宝你记住！", story: "三宝终于落网", personality: "可靠沉稳的接纳型" },
    DRINK: { quote: "轻松一刻，来瓶养乐多！", story: "好奇心丢了蛋呀", personality: "活泼开朗的活力型" },
    LAMP: { quote: "人，不开心都要和咪说哦。", story: "竹林四宝之一", personality: "温暖的慢热型" },
  };

  for (const [type, content] of Object.entries(expected)) {
    await page.goto(`http://127.0.0.1:8765/?result=${type}`, { waitUntil: "networkidle" });
    await page.waitForSelector("#resultView.is-active");
    const actual = await page.evaluate(() => ({
      quote: document.querySelector("#resultQuote").textContent.trim(),
      story: document.querySelector("#resultBiography").textContent,
      personality: document.querySelector("#resultPersonality").textContent,
      personalityParagraphs: document.querySelectorAll("#resultPersonality p").length,
      storyParagraphs: document.querySelectorAll("#resultBiography p").length,
    }));
    if (actual.quote !== content.quote) throw new Error(`${type} quote mismatch: ${actual.quote}`);
    if (!actual.story.includes(content.story)) throw new Error(`${type} story content is missing`);
    if (!actual.personality.includes(content.personality)) throw new Error(`${type} personality content is missing`);
    if (actual.personalityParagraphs < 2) throw new Error(`${type} personality was not divided into paragraphs`);
    if (actual.storyParagraphs < 4) throw new Error(`${type} story was not divided into paragraphs`);
    if (type === "LAMP") await page.screenshot({ path: "qa/content-lamp-mobile.png", fullPage: true });
  }

  await page.goto("http://127.0.0.1:8765/#cats", { waitUntil: "networkidle" });
  const guide = (await page.locator(".guide-bubble").textContent()).trim();
  const expectedGuide = "住在不同区解锁的咪也不一样呀！来提前认识一下咪们吧，欢迎来摊位上购入咪学长学姐周边！";
  if (guide !== expectedGuide) throw new Error(`guide copy mismatch: ${guide}`);

  const configAudit = await page.evaluate(() => ({
    catCount: window.CATBTI_CONFIG.cats.length,
    allHaveParagraphs: window.CATBTI_CONFIG.cats.every((cat) => Array.isArray(cat.storyBlocks) && cat.storyBlocks.some((block) => block.text)),
    asciiPunctuation: window.CATBTI_CONFIG.cats.flatMap((cat) => [cat.quote, cat.personality, ...cat.storyBlocks.filter((block) => block.text).map((block) => block.text)]).filter((text) => /[!?;]/.test(text)),
  }));
  if (configAudit.catCount !== 16 || !configAudit.allHaveParagraphs) throw new Error(`config paragraph audit failed: ${JSON.stringify(configAudit)}`);
  if (configAudit.asciiPunctuation.length) throw new Error(`ASCII punctuation remains: ${configAudit.asciiPunctuation.join(" | ")}`);
  if (errors.length) throw new Error(errors.join("\n"));

  console.log(JSON.stringify({ updatedCats: Object.keys(expected), guide, configAudit }, null, 2));
  await browser.close();
})();
