const { chromium } = require(process.argv[2]);

(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
  const errors = [];

  async function checkPage(viewport, screenshot) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("http://127.0.0.1:8765/?result=LOVE-U", { waitUntil: "networkidle" });
    await page.waitForSelector("#resultView.is-active");

    const resultState = await page.evaluate(() => {
      const heading = document.querySelector(".result-heading").getBoundingClientRect();
      const type = document.querySelector("#resultType").getBoundingClientRect();
      const title = document.querySelector("#resultTitle").getBoundingClientRect();
      return {
        resultMarkCount: document.querySelectorAll(".result-cat-mark").length,
        thanksStickerCount: document.querySelectorAll(".thanks-cat-crowd").length,
        barcode: document.querySelector("#resultBarcodeCode").textContent.trim(),
        removedCopyPresent: [
          "测试结束了，但校园猫咪的故事还在继续。",
          "继续认识校园里的猫咪与猫协工作",
          "谢谢每一次认真记录、照顾与守护",
        ].some((text) => document.body.innerText.includes(text)),
        typeFits: type.left >= heading.left && type.right <= heading.right,
        typeCentered: Math.abs((type.left + type.right) / 2 - (heading.left + heading.right) / 2) < 2,
        titleCentered: Math.abs((title.left + title.right) / 2 - (heading.left + heading.right) / 2) < 2,
      };
    });

    if (resultState.resultMarkCount !== 0) throw new Error("result cat mark still exists");
    if (resultState.thanksStickerCount !== 0) throw new Error("thanks cat stickers still exist");
    if (resultState.barcode !== "CATBTI · LOVE-U") throw new Error(`unexpected barcode label: ${resultState.barcode}`);
    if (resultState.removedCopyPresent) throw new Error("removed result copy is still visible");
    if (!resultState.typeFits || !resultState.typeCentered || !resultState.titleCentered) {
      throw new Error(`result heading layout failed: ${JSON.stringify(resultState)}`);
    }

    await page.waitForSelector("#receiptScene.is-printed");
    await page.click("#resultGalleryButton");
    if (!(await page.locator("#galleryBackButton").isVisible())) throw new Error("gallery return button is not visible");
    await page.click(".cat-card");
    const signature = (await page.locator(".dialog-signature").textContent()).trim();
    if (!signature) throw new Error("gallery dialog signature is empty");
    await page.click("#dialogClose");
    await page.click("#galleryBackButton");
    if (!(await page.locator("#resultView").evaluate((node) => node.classList.contains("is-active")))) {
      throw new Error("gallery return button did not return to result");
    }

    await page.waitForTimeout(700);
    await page.screenshot({ path: screenshot, fullPage: true });
    await page.close();
    return resultState;
  }

  const desktop = await checkPage({ width: 1200, height: 850 }, "tests/browser/latest-result-desktop.png");
  const mobile = await checkPage({ width: 390, height: 844 }, "tests/browser/latest-result-mobile.png");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ desktop, mobile }, null, 2));
  await browser.close();
})();
