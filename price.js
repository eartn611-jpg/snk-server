const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// カードは状態A平均、BOXは個数価格を単価にして平均
async function extractPrice(page) {
  const result = await page.evaluate(() => {
    const text = document.body.innerText;

    const lines = text
      .split("\n")
      .map((v) => v.trim().replace(/^¥/, ""))
      .filter(Boolean);

    // ① カード：状態Aの売買履歴
    const start = text.indexOf("状態Aの売買履歴");
    const end = text.indexOf("状態Aの売買相場");

    if (start !== -1 && end !== -1) {
      const target = text.slice(start, end);

      const cardLines = target
        .split("\n")
        .map((v) => v.trim().replace(/^¥/, ""))
        .filter(Boolean);

      const cardPrices = [];

      for (let i = 0; i < cardLines.length; i++) {
        if (cardLines[i] === "A") {
          const priceLine = cardLines[i + 1];

          if (/^[\d,]+$/.test(priceLine || "")) {
            cardPrices.push(Number(priceLine.replace(/,/g, "")));
          }
        }
      }

      if (cardPrices.length) {
        return { type: "card", prices: cardPrices };
      }
    }

    // ② BOX：個数価格 → 1個あたり単価
    const boxPrices = [];

    for (let i = 0; i < lines.length; i++) {
      const countMatch = lines[i].match(/^(\d+)個$/);

      if (countMatch) {
        const count = Number(countMatch[1]);
        const priceLine = lines[i + 1];

        if (/^[\d,]+$/.test(priceLine || "")) {
          const totalPrice = Number(priceLine.replace(/,/g, ""));

          if (count > 0) {
            boxPrices.push(Math.round(totalPrice / count));
          }
        }
      }
    }

    return { type: "box", prices: boxPrices };
  });

  console.log("価格タイプ:", result.type);
  console.log("取得価格:", result.prices);

  if (!result.prices.length) return null;

  const avg =
    result.prices.reduce((sum, price) => sum + price, 0) / result.prices.length;

  return Math.round(avg);
}

async function getProduct(id) {
  let browser;

  try {
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

    // ① まずカード用：売買履歴ページ
    const salesUrl = `https://snkrdunk.com/apparels/${id}/sales-histories?slide=right`;

    await page.goto(salesUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await new Promise((r) => setTimeout(r, 8000));

    let title = await page.title();

    let image = await page.evaluate(() => {
      const og = document.querySelector('meta[property="og:image"]');
      return og ? og.getAttribute("content") : null;
    });

    let price = await extractPrice(page);

    // ② 状態Aが取れない商品はBOXとして商品ページを見る
    if (!price) {
      const productUrl = `https://snkrdunk.com/apparels/${id}`;

      await page.goto(productUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await new Promise((r) => setTimeout(r, 8000));

      title = await page.title();

      image = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]');
        return og ? og.getAttribute("content") : null;
      });

      price = await extractPrice(page);
    }

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
