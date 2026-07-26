const { chromium } = require(process.argv[2]);

(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  async function runPath(options) {
    await page.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" });
    await page.click("#startButton");
    for (const option of options) {
      const currentQuestion = await page.locator("#questionTitle").textContent();
      await page.locator(".option-button").nth(option).click();
      await page.waitForFunction(
        (previous) => document.body.dataset.view === "result" || document.querySelector("#questionTitle").textContent !== previous,
        currentQuestion,
      );
    }
    await page.waitForSelector("#resultView.is-active");
    return page.evaluate(() => ({
      type: document.querySelector("#resultType").textContent,
      name: document.querySelector("#resultCatName").textContent,
    }));
  }

  const xiaoxiao = await runPath([0, 1, 0, 0, 1, 0, 2, 1, 0]);
  const eastFood = await runPath([0, 1, 0, 1, 0, 1, 0, 2]);

  if (xiaoxiao.type !== "CHIL" || xiaoxiao.name !== "笑笑") {
    throw new Error(`笑笑路径错误: ${JSON.stringify(xiaoxiao)}`);
  }
  if (eastFood.type === "XXXL" || eastFood.name === "三宝") {
    throw new Error(`东区路径仍错误返回三宝: ${JSON.stringify(eastFood)}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));

  console.log(JSON.stringify({ xiaoxiao, eastFood }, null, 2));
  await browser.close();
})();
