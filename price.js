const express = require("express");
const axios = require("axios");

const app = express();

const products = [
  {
    id: "618443",
    url: "https://snkrdunk.com/apparels/618443",
  },
  {
    id: "116069",
    url: "https://snkrdunk.com/apparels/116069",
  },
];

async function getProduct(product) {
  try {
    const response = await axios.get(product.url);
    const html = response.data;

    const priceMatch =
      html.match(/"price":\s?(\d+)/) || html.match(/"amount":\s?(\d+)/);

    const nameMatch = html.match(/"name":"(.*?)"/);
    const imageMatch = html.match(/"image":"(.*?)"/);

    return {
      id: product.id,
      price: priceMatch ? Number(priceMatch[1]) : null,
      name: nameMatch ? nameMatch[1] : "商品名なし",
      image: imageMatch ? imageMatch[1] : null,
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
  try {
    const results = await Promise.all(products.map((p) => getProduct(p)));
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: "取得失敗" });
  }
});

app.listen(3000, () => {
  console.log("サーバー起動");
});
