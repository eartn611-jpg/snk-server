const express = require("express");
const axios = require("axios");

const app = express();

const defaultProducts = [
  {
    id: "618443",
    url: "https://snkrdunk.com/apparels/618443",
  },
  {
    id: "730956",
    url: "https://snkrdunk.com/apparels/730956",
  },
  {
    id: "116069",
    url: "https://snkrdunk.com/apparels/116069",
  },
];

function cleanText(text) {
  if (!text) return null;

  return text
    .replace(/\\u0026/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/\\"/g, '"')
    .trim();
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

    const priceMatch =
      html.match(/"price":\s?(\d+)/) ||
      html.match(/"amount":\s?(\d+)/) ||
      html.match(/"lowPrice":\s?(\d+)/) ||
      html.match(/"minPrice":\s?(\d+)/);

    const nameMatch =
      html.match(/"name":"(.*?)"/) || html.match(/<title>(.*?)<\/title>/);

    const imageMatch =
      html.match(/"image":"(.*?)"/) ||
      html.match(/property="og:image" content="(.*?)"/);

    return {
      id: product.id,
      price: priceMatch ? Number(priceMatch[1]) : null,
      name: cleanText(nameMatch ? nameMatch[1] : "商品名なし"),
      image: cleanText(imageMatch ? imageMatch[1] : null),
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

  const product = {
    id,
    url: `https://snkrdunk.com/apparels/${id}`,
  };

  const result = await getProduct(product);
  res.json(result);
});

app.listen(3000, () => {
  console.log("サーバー起動");
});
