import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Product = {
  id: string;
  price: number | null;
  name: string;
  image: string | null;
};

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("https://snk-server.onrender.com/prices")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
      })
      .catch((err) => {
        console.log("取得エラー", err);
      });
  }, []);

  if (products.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>読み込み中...</Text>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>商品一覧</Text>

      {products.map((item) => (
        <View key={item.id} style={styles.card}>
          {item.image && <Image source={{ uri: item.image }} style={styles.image} />}

          <Text style={styles.name}>{item.name}</Text>

          <Text style={styles.price}>
            {item.price ? `${item.price.toLocaleString()} 円` : "価格取得失敗"}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#000000",
  },
  card: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  image: {
    width: 160,
    height: 160,
    resizeMode: "contain",
  },
  name: {
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
    color: "#000000",
  },
  price: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 8,
    color: "#000000",
  },
});