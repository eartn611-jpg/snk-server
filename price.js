const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// 🔥 状態Aの売買履歴から平均価格
async function extractPrice(page) {
  const prices = await page.evaluate(() => {
    const text = document.body.innerText;

    const start = text.indexOf("状態Aの売買履歴");
    const end = text.indexOf("状態Aの売買相場");

    if (start === -1 || end === -1) return [];

    const target = text.slice(start, end);

    const lines = target
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);

    const result = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "A") {
        const priceLine = lines[i + 1];
        const match = priceLine?.match(/^[\d,]+$/);

        if (match) {
          result.push(Number(priceLine.replace(/,/g, "")));
        }
      }
    }

    return result;
  });

  console.log("状態A価格:", prices);

  if (!prices.length) return null;

  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  return Math.round(avg);
}

async function getProduct(id) {
  let browser;

  try {
    const url = `https://snkrdunk.com/apparels/${id}/sales-histories?slide=right`;

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
      timeout: 60000,
    });

    // 🔥 JS読み込み待ち
    await new Promise((r) => setTimeout(r, 8000));

    const title = await page.title();

    const image = await page.evaluate(() => {
      const og = document.querySelector('meta[property="og:image"]');
      return og ? og.getAttribute("content") : null;
    });

    const price = await extractPrice(page);

    return {
      id,
      price,
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
