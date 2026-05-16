const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

function cleanText(text) {
  if (!text) return null;
  return text
    .replace(/\\u0026/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

function extractPrice(html) {
  const patterns = [
    /"price":\s?(\d+)/,
    /"amount":\s?(\d+)/,
    /"lowPrice":\s?(\d+)/,
    /"minPrice":\s?(\d+)/,
    /"lowestPrice":\s?(\d+)/,
    /"displayPrice":\s?(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

async function getProduct(id) {
  try {
    const url = `https://snkrdunk.com/apparels/${id}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const price = extractPrice(html);

    const name =
      cleanText($('meta[property="og:title"]').attr("content")) ||
      cleanText($("title").text()) ||
      "商品名なし";

    const image =
      cleanText($('meta[property="og:image"]').attr("content")) || null;

    return {
      id,
      price,
      name,
      image,
    };
  } catch (e) {
    return {
      id,
      price: null,
      name: "取得失敗",
      image: null,
    };
  }
}

// 単体取得（←これが追加機能で使われる）
app.get("/price/:id", async (req, res) => {
  const result = await getProduct(req.params.id);
  res.json(result);
});

// 複数取得（最初の表示用）
app.get("/prices", async (req, res) => {
  const ids = ["618443"];

  const results = await Promise.all(ids.map((id) => getProduct(id)));
  res.json(results);
});

app.listen(3000, () => {
  console.log("サーバー起動");
});
