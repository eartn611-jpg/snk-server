const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// 🔥 状態Aの売買平均価格だけ取得
function extractPrice(text) {
  // 状態Aブロックを切り出す
  const block = text.match(/状態A[\s\S]{0,800}/);
  if (!block) return null;

  // 売買平均価格を探す
  const match = block[0].match(
    /売買平均価格[\s\S]{0,100}?(¥?\s?[\d,]+円|¥\s?[\d,]+)/,
  );
  if (!match) return null;

  return Number(match[1].replace(/[^\d]/g, ""));
}

async function getProduct(id) {
  let browser;

  try {
    const url = `https://snkrdunk.com/apparels/${id}`;

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000, // ← 少し長くする
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);

    const image = await page.evaluate(() => {
      const og = document.querySelector('meta[property="og:image"]');
      return og ? og.getAttribute("content") : null;
    });

    return {
      id,
      price: extractPrice(bodyText),
      name: title || "商品名なし",
      image,
    };
  } catch (e) {
    return {
      id,
      price: null,
      name: "取得失敗",
      image: null,
      error: String(e),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

app.get("/price/:id", async (req, res) => {
  const result = await getProduct(req.params.id);
  res.json(result);
});

app.listen(3000, () => {
  console.log("サーバー起動");
});
