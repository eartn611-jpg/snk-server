const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

function extractPrice(text) {
  const matches = text.match(/¥?\s?[\d,]+円|¥\s?[\d,]+/g);
  if (!matches) return null;

  const prices = matches
    .map((v) => Number(v.replace(/[^\d]/g, "")))
    .filter((n) => n > 1000);

  return prices.length ? Math.min(...prices) : null;
}

async function getProduct(id) {
  const url = `https://snkrdunk.com/apparels/${id}`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

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
    };
  } finally {
    await browser.close();
  }
}

app.get("/price/:id", async (req, res) => {
  const result = await getProduct(req.params.id);
  res.json(result);
});

app.get("/prices", async (req, res) => {
  const ids = ["618443"];
  const results = await Promise.all(ids.map((id) => getProduct(id)));
  res.json(results);
});

app.listen(3000, () => {
  console.log("サーバー起動");
});
