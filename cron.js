const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(__dirname, "products.json");
const HISTORY_PATH = path.join(__dirname, "history.json");

const API_BASE = "https://snk-server-1.onrender.com";

async function loadProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

async function fetchPrice(id) {
  const res = await fetch(`${API_BASE}/price/${id}`);
  return await res.json();
}

async function runCron() {
  console.log("価格履歴更新開始");

  const ids = await loadProducts();
  const history = loadHistory();

  for (const id of ids) {
    try {
      const data = await fetchPrice(id);

      if (!data.price) {
        console.log(`${id}: priceなし`);
        continue;
      }

      if (!history[id]) history[id] = [];

      history[id].push({
        date: new Date().toISOString(),
        price: data.price,
        name: data.name,
        image: data.image,
      });

      history[id] = history[id].slice(-100);

      console.log(`${id}: ${data.price}円 保存`);

      await new Promise((r) => setTimeout(r, 3000));
    } catch (e) {
      console.log(`${id}: エラー`, e);
    }
  }

  saveHistory(history);
  console.log("価格履歴更新完了");
}

runCron();

// 15分ごと
setInterval(runCron, 15 * 60 * 1000);
