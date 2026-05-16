import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

export default function HomeScreen() {
  const [price, setPrice] = useState<number | null>(null);
  const [prices, setPrices] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const getPrice = async () => {
    try {
      const response = await fetch("http://192.168.3.27:3000/price");
      const data = await response.json();

      if (data.price) {
        setPrice(data.price);
        setName(data.name);
        setImage(data.image);

        setPrices((prev) => {
          const next = [...prev, data.price];
          return next.slice(-10);
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getPrice();
    const timer = setInterval(getPrice, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SNKRDUNK価格</Text>

      {/* 商品画像 */}
      {image && (
        <Image source={{ uri: image }} style={styles.image} />
      )}

      {/* 商品名 */}
      <Text style={styles.name}>{name}</Text>

      {/* 価格 */}
      <Text style={styles.price}>
        {price ? `¥${price.toLocaleString()}` : "取得中..."}
      </Text>

      {/* グラフ */}
      {prices.length >= 2 && (
        <LineChart
          data={{
            labels: prices.map((_, i) => `${i + 1}`),
            datasets: [{ data: prices }],
          }}
          width={Dimensions.get("window").width - 40}
          height={220}
          yAxisLabel="¥"
          chartConfig={{
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          bezier
          style={styles.chart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 40,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  price: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 20,
  },
  chart: {
    borderRadius: 16,
  },
});