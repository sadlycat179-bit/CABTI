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
    DRINK: { quote: "轻松一刻，来瓶养乐多！", story: "好奇心丢了蛋呀", personality: "活泼开朗的活力型", title: "清爽小饮料" },
    LAMP: { quote: "人，不开心都要和咪说哦。", story: "竹林四宝之一", personality: "温暖的慢热型", title: "慢热守望者" },
  };

  for (const [type, content] of Object.entries(expected)) {
    await page.goto(`http://127.0.0.1:8765/?result=${type}`, { waitUntil: "networkidle" });
    await page.waitForSelector("#resultView.is-active");
    const actual = await page.evaluate(() => ({
      quote: document.querySelector("#resultQuote").textContent.trim(),
      title: document.querySelector("#resultTitle").textContent.trim(),
      story: document.querySelector("#resultBiography").textContent,
      personality: document.querySelector("#resultPersonality").textContent,
      personalityParagraphs: document.querySelectorAll("#resultPersonality p").length,
      storyParagraphs: document.querySelectorAll("#resultBiography p").length,
      firstImage: document.querySelector("#resultPhotoTrack img") && document.querySelector("#resultPhotoTrack img").getAttribute("src"),
    }));
    if (actual.quote !== content.quote) throw new Error(`${type} quote mismatch: ${actual.quote}`);
    if (!actual.story.includes(content.story)) throw new Error(`${type} story content is missing`);
    if (!actual.personality.includes(content.personality)) throw new Error(`${type} personality content is missing`);
    if (content.title && actual.title !== content.title) throw new Error(`${type} title mismatch: ${actual.title}`);
    if (type === "DRINK" && actual.firstImage !== "images/updated-cats/yangleduo-new.jpg") throw new Error(`DRINK image mismatch: ${actual.firstImage}`);
    if (actual.personalityParagraphs < 2) throw new Error(`${type} personality was not divided into paragraphs`);
    if (actual.storyParagraphs < 4) throw new Error(`${type} story was not divided into paragraphs`);
    if (type === "LAMP") await page.screenshot({ path: "qa/content-lamp-mobile.png", fullPage: true });
    if (type === "DRINK") await page.screenshot({ path: "qa/content-drink-mobile.png", fullPage: true });
  }

  await page.goto("http://127.0.0.1:8765/#cats", { waitUntil: "networkidle" });
  const guide = (await page.locator(".guide-bubble").textContent()).trim();
  const expectedGuide = "住在不同区解锁的咪也不一样呀！来提前认识一下咪们吧，欢迎来摊位上购入咪学长学姐周边！";
  if (guide !== expectedGuide) throw new Error(`guide copy mismatch: ${guide}`);
  const galleryText = await page.locator("#catGrid").innerText();
  if (galleryText.includes("中区")) throw new Error("central area still appears in gallery");
  const northText = await page.locator(".cat-region-north").innerText();
  if (!northText.includes("养乐多") || !northText.includes("桔子灯")) throw new Error("north gallery group is missing updated cats");

  const configAudit = await page.evaluate(() => ({
    catCount: window.CATBTI_CONFIG.cats.length,
    allHaveParagraphs: window.CATBTI_CONFIG.cats.every((cat) => Array.isArray(cat.storyBlocks) && cat.storyBlocks.some((block) => block.text)),
    areaOptions: window.CATBTI_CONFIG.questions.find((question) => question.id === "area").options.map((option) => option.value),
    drinkTraits: window.CATBTI_CONFIG.cats.find((cat) => cat.type === "DRINK").traits,
    lampTraits: window.CATBTI_CONFIG.cats.find((cat) => cat.type === "LAMP").traits,
    asciiPunctuation: window.CATBTI_CONFIG.cats.flatMap((cat) => [cat.quote, cat.personality, ...cat.storyBlocks.filter((block) => block.text).map((block) => block.text)]).filter((text) => /[!?;]/.test(text)),
  }));
  if (configAudit.catCount !== 16 || !configAudit.allHaveParagraphs) throw new Error(`config paragraph audit failed: ${JSON.stringify(configAudit)}`);
  if (configAudit.areaOptions.includes("central")) throw new Error("central area option still exists");
  if (JSON.stringify(configAudit.drinkTraits) !== JSON.stringify({ attitude: "friendly", action: "active", area: "north", pursuit: "adored" })) throw new Error("DRINK traits mismatch");
  if (JSON.stringify(configAudit.lampTraits) !== JSON.stringify({ attitude: "friendly", action: "active", area: "north", pursuit: "guard" })) throw new Error("LAMP traits mismatch");
  if (configAudit.asciiPunctuation.length) throw new Error(`ASCII punctuation remains: ${configAudit.asciiPunctuation.join(" | ")}`);
  if (errors.length) throw new Error(errors.join("\n"));

  console.log(JSON.stringify({ updatedCats: Object.keys(expected), guide, configAudit }, null, 2));
  await browser.close();
})();
