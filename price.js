const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

const defaultProducts = [
  { id: "618443", url: "https://snkrdunk.com/apparels/618443" },
  { id: "730956", url: "https://snkrdunk.com/apparels/730956" },
  { id: "116069", url: "https://snkrdunk.com/apparels/116069" },
];

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

async function getProduct(product) {
  try {
    const response = await axios.get(product.url, {
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
      id: product.id,
      price,
      name,
      image,
    };
  } catch (e) {
    return {
      id: product.id,
      price: null,
      name: "取得失敗",
      image: null,
    };
  }
}

app.get("/prices", async (req, res) => {
  const results = await Promise.all(
    defaultProducts.map((product) => getProduct(product)),
  );
  res.json(results);
});

app.get("/price/:id", async (req, res) => {
  const id = req.params.id;
  const result = await getProduct({
    id,
    url: `https://snkrdunk.com/apparels/${id}`,
  });
  res.json(result);
});

app.listen(3000, () => {
  console.log("サーバー起動");
});
