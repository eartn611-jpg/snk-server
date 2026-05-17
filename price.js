const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

const PRODUCTS_PATH = path.join(__dirname, "products.json");
const HISTORY_PATH = path.join(__dirname, "history.json");

// 履歴読み込み
function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
}

// 履歴保存
function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

// 商品ID読み込み
function loadProducts() {
  if (!fs.existsSync(PRODUCTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
}

// カードは状態A、BOXは1個価格
async function extractPrice(page) {
  const result = await page.evaluate(() => {
    const text = document.body.innerText;

    const lines = text
      .split("\n")
      .map((v) => v.trim().replace(/^¥/, ""))
      .filter(Boolean);

    // カード：状態A
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

    // BOX：1個価格のみ
    const oneBoxPrices = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "1個") {
        const priceLine = lines[i + 1];

        if (/^[\d,]+$/.test(priceLine || "")) {
          oneBoxPrices.push(Number(priceLine.replace(/,/g, "")));
        }
      }
    }

    return { type: "box_1個", prices: oneBoxPrices };
  });

  console.log("価格タイプ:", result.type);
  console.log("取得価格:", result.prices);

  if (!result.prices.length) return null;

  const avg =
    result.prices.reduce((sum, price) => sum + price, 0) / result.prices.length;

  return Math.round(avg);
}

// 商品取得
async function getProduct(id) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
      ],
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["font", "media"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    );

    // まずカード用：売買履歴
    const salesUrl = `https://snkrdunk.com/apparels/${id}/sales-histories?slide=right`;

    await page.goto(salesUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await new Promise((r) => setTimeout(r, 4000));

    let title = await page.title();

    let image = await page.evaluate(() => {
      const og = document.querySelector('meta[property="og:image"]');
      return og ? og.getAttribute("content") : null;
    });

    let price = await extractPrice(page);

    // カードで取れなかったらBOX用：商品ページ
    if (!price) {
      const productUrl = `https://snkrdunk.com/apparels/${id}`;

      await page.goto(productUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await new Promise((r) => setTimeout(r, 4000));

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

// 価格取得API
app.get("/price/:id", async (req, res) => {
  const result = await getProduct(req.params.id);
  res.json(result);
});

// 履歴取得API
app.get("/history/:id", (req, res) => {
  const history = loadHistory();
  const id = req.params.id;

  res.json({
    id,
    history: history[id] || [],
  });
});

// 外部cron用API
app.get("/cron", async (req, res) => {
  const ids = loadProducts();
  const history = loadHistory();

  console.log("cron開始:", ids);

  for (const id of ids) {
    const data = await getProduct(id);

    if (!data.price) {
      console.log(`${id}: priceなし`);
      continue;
    }

    if (!history[id]) {
      history[id] = [];
    }

    history[id].push({
      date: new Date().toISOString(),
      price: data.price,
      name: data.name,
      image: data.image,
    });

    history[id] = history[id].slice(-100);

    console.log(`${id}: ${data.price}円 保存`);

    // Renderのメモリ対策
    await new Promise((r) => setTimeout(r, 3000));
  }

  saveHistory(history);

  res.json({
    ok: true,
    updated: ids.length,
  });
});

app.listen(3000, () => {
  console.log("サーバー起動");
});
