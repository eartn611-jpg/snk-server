const express = require("express");
const axios = require("axios");

const app = express();

async function getProduct(id) {
  const url = `https://snkrdunk.com/apparels/${id}`;
  const response = await axios.get(url);
  const html = response.data;

  const priceMatch = html.match(/"price":(\d+)/);
  const nameMatch = html.match(/"name":"(.*?)"/);
  const imageMatch = html.match(/"image":"(.*?)"/);

  return {
    id,
    price: priceMatch ? Number(priceMatch[1]) : null,
    name: nameMatch ? nameMatch[1] : "商品名なし",
    image: imageMatch ? imageMatch[1] : null,
  };
}

app.get("/price/:id", async (req, res) => {
  try {
    const product = await getProduct(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "取得失敗" });
  }
});

app.get("/prices", async (req, res) => {
  try {
    const ids = ["618443", "730956", "116069"];

    const products = await Promise.all(ids.map((id) => getProduct(id)));

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "一覧取得失敗" });
  }
});

app.listen(3000, () => {
  console.log("サーバー起動");
});
