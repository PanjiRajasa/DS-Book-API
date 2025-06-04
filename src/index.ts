import express, { Request, Response } from "express";
import { db } from "./firebase";
import admin from "firebase-admin";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes";
import shopRoutes from "./routes/shopRoutes";
import userRoutes from "./routes/userRoutes";

//Basic configuration
const app = express();
const PORT = 3000;
dotenv.config(); //Manage environemnt variable from .env file


app.use(express.json()); //Parse the JSON request body into a JavaScript object.

//middleware logging
app.use(function(req, res, next) {
    console.log(`request method: ${req.method}`);
    console.log(`request was made: ${req.url}`);

    next();
});

// Konfigurasi CORS yang mengizinkan origin tertentu
const corsOptions = {
  origin: ["http://localhost:5501", "http://127.0.0.1:5501"], // Ganti sesuai port frontend kamu
  credentials: true, // Jika kamu pakai cookies (optional)
};

app.use(cors(corsOptions)); // Terapkan konfigurasi CORS

// Ini akan otomatis handle OPTIONS method
app.options('*', cors(corsOptions));

//Basic route
app.get("/", (req, res) => {
  res.send("API is running!");
});

//products routes (/products)
app.use("/products", productRoutes);

//shop routes (/shop)
app.use("/shop", shopRoutes);

//users route
app.use("/users", userRoutes);

// POST /carts/add
app.post("/carts/add", async (req, res): Promise<any> => {
  const { uid, productId, quantity } = req.body;
  
  if (!uid || !productId || !quantity) {
    res.status(400).json({ error: "User ID, product ID, and quantity required" });
    return;
  }
  
  try {
    // Menggunakan cartId yang unik berdasarkan kombinasi uid dan productId
    const cartId = `${uid}_${productId}`;
    
    // Mendapatkan info produk untuk disimpan di cart
    const productDoc = await db.collection("products").doc(productId).get();
    const product = productDoc.data();
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    await db.collection("carts").doc(cartId).set({
      uid,
      productId,
      quantity,
      productName: product.name,
      productImage: product.image,
      price: product.price,
      totalPrice: product.price * quantity,
      addedAt: new Date()
    });
     
    res.status(200).json({ message: "Item added to cart" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to add item to cart"});
  }
});

// POST /orders/create
app.post("/orders/create", async (req, res): Promise<any> => {
  const { uid } = req.body;
  
  if (!uid) {
    return res.status(400).json({ error: "User ID required" });
  }
  
  try {
    // 1. Ambil semua item di keranjang pengguna
    const cartSnapshot = await db.collection("carts").where("uid", "==", uid).get();
    
    if (cartSnapshot.empty) {
      return res.status(400).json({ error: "Cart is empty" });
    }
    
    // 2. Konversi data cart menjadi array item untuk order
    const items: any = [];
    let totalAmount = 0;
    
    cartSnapshot.forEach(doc => {
      const cartItem = doc.data();
      totalAmount += cartItem.totalPrice;
      items.push({
        productId: cartItem.productId,
        productName: cartItem.productName,
        productImage: cartItem.productImage,
        quantity: cartItem.quantity,
        price: cartItem.price,
        totalPrice: cartItem.totalPrice
      });
    });
    
    // 3. Buat order baru dengan judul dan timestamp untuk history
    const orderRef = await db.collection("orders").add({
      userId: uid,
      title: `Order #${new Date().getTime().toString().slice(-6)}`, // Membuat judul order dengan nomor unik
      items,
      totalItems: items.length,
      totalAmount,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 4. Hapus keranjang pengguna setelah order berhasil dibuat
    const deletePromises = cartSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);
    
    // 5. Tambahkan juga ke koleksi order_history untuk memudahkan query
    await db.collection("order_history").doc(orderRef.id).set({
      orderId: orderRef.id,
      userId: uid,
      title: `Order #${new Date().getTime().toString().slice(-6)}`,
      totalAmount,
      totalItems: items.length,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    res.status(200).json({ 
      message: "Order placed successfully", 
      orderId: orderRef.id 
    });
    
  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ error: "Failed to place order"});
  }
});

// GET /orders/history/:uid
app.get("/orders/history/:uid", async (req, res): Promise<any> => {
  const { uid } = req.params;
  
  if (!uid) {
    return res.status(400).json({ error: "User ID required" });
  }
  
  try {
    const historySnapshot = await db.collection("order_history")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();
    
    if (historySnapshot.empty) {
      return res.status(200).json({ orders: [] });
    }
    
    const orders: any = [];
    historySnapshot.forEach(doc => {
      const orderData = doc.data();
      orders.push({
        id: doc.id,
        title: orderData.title,
        date: orderData.createdAt.toDate(), // Convert Firestore timestamp to JS Date
        status: orderData.status,
        totalAmount: orderData.totalAmount,
        totalItems: orderData.totalItems
      });
    });
    
    res.status(200).json({ orders });
  } catch (err) {
    console.error("Get order history error:", err);
    res.status(500).json({ error: "Failed to get order history" });
  }
});


// GET /orders/:orderId
app.get("/orders/:orderId", async (req, res): Promise<any> => {
  const { orderId } = req.params;
  
  if (!orderId) {
    return res.status(400).json({ error: "Order ID required" });
  }
  
  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    const orderData: any = orderDoc.data();
    
    res.status(200).json({ 
      order: {
        id: orderDoc.id,
        title: orderData.title,
        date: orderData.createdAt.toDate(),
        status: orderData.status,
        totalAmount: orderData.totalAmount,
        items: orderData.items,
        userId: orderData.userId
      } 
    });
  } catch (err) {
    console.error("Get order details error:", err);
    res.status(500).json({ error: "Failed to get order details" });
  }
});

 
// Optional: Middleware to handle global mistake
app.use(async (req, res, next) => {
  res.status(500).json({ error: 'Something went wrong!' });
  next();
});

app.listen(PORT, function() {console.log(`It's alive on http://localhost:${PORT}`)}); //Set server port and display it to console