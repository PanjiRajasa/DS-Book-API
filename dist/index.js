"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const firebase_1 = require("./firebase");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const brevo_1 = require("@getbrevo/brevo");
dotenv_1.default.config(); //Manage environemnt variable from .env file
//Basic configuration
const app = (0, express_1.default)();
const PORT = 3000;
app.use(express_1.default.json()); //Parse the JSON request body into a JavaScript object.
app.use((0, cors_1.default)()); //Enable cross-domain communication (CORS) for your API.
//Brevo configuration
//we use JS syntax instead so if an error occurs, we can fix it easy (the documentation write in JS syntax)
const SibApiV3Sdk = require('sib-api-v3-sdk'); //require the sib-api-v3-sdk
const defaultClient = SibApiV3Sdk.ApiClient.instance; //default client
const apiKey = defaultClient.authentications['api-key']; //authentication type
apiKey.apiKey = process.env.BREVO_API_KEY; //API key that stored in the .env
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi(); //Make API instance
// Parse application/json
app.use(body_parser_1.default.json());
// Optional: Parse application/x-www-form-urlencoded
app.use(body_parser_1.default.urlencoded({ extended: true }));
//middleware logging
app.use(function (req, res, next) {
    console.log(`request method: ${req.method}`);
    console.log(`request was made: ${req.url}`);
    next();
});
//GET products
app.get("/products", async (req, res) => {
    try {
        const snapshot = await firebase_1.db.collection('products').get(); //get the products collection
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })); //map the product
        res.status(200).json(products); //send the response as a JSON also with 200 code
    }
    catch (err) {
        console.error(err); //display the error
        res.status(500).json({ error: 'Failed to fetch products.' }); //server error handling
    }
});
//GET detail products
app.get("/products/:productId", async (req, res) => {
    const { productId } = req.params; //Get the productId string query
    try {
        const doc = await firebase_1.db.collection("products").doc(productId).get(); //get the products collection data based on the ID
        //if the prodcut did not exist (wrong ID)
        if (!doc.exists) {
            res.status(404).json({ error: "Product not found" }); //return 404 and error message
        }
        else {
            const productData = doc.data(); //get the products data
            res.status(200).json(productData); //return 200 and display the data as JSON
        }
    }
    catch (error) {
        console.error(error); //display the error message
        res.status(500).json({ error: "Failed to fetch product" }); //return 500 (error from server)
    }
});
//POST products
app.post('/products', async (req, res) => {
    try {
        const { name, image, description, summary, price } = req.body; //data from req.body
        //null checking
        if (!name || !image || !description || !summary || !price) {
            res.status(400).json({ message: 'Please insert all data' });
        }
        //new data
        const newProduct = {
            name,
            image,
            description,
            summary,
            price,
            createdAt: new Date(),
        };
        const docRef = await firebase_1.db.collection('products').add(newProduct); //add new document to the collection
        res.status(201).json({ message: 'Product created', id: docRef.id }); //success message
    }
    catch (error) {
        //error handling and send 500 code
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
//PUT products
app.put("/products/:productId", async (req, res) => {
    const { productId } = req.params;
    const { name, price, description, summary, image } = req.body;
    if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
    }
    try {
        // Buat objek data yang akan diupdate
        const updateData = {
            updatedAt: new Date()
        };
        if (name)
            updateData.name = name;
        if (price)
            updateData.price = price;
        if (description)
            updateData.description = description;
        if (summary !== undefined)
            updateData.summary = summary;
        if (image)
            updateData.image = image;
        await firebase_1.db.collection("products").doc(productId).update(updateData);
        res.status(200).json({ message: "Product updated successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update product" });
    }
});
//GET shops data
app.get("/shop", async (req, res) => {
    try {
        const snapshot = await firebase_1.db.collection('shop').get(); //get the shop collection
        const shop = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })); //map the shop
        res.status(200).json(shop); //send the response as a JSON also with 200 code
    }
    catch (err) {
        console.error(err); //display the error
        res.status(500).json({ error: 'Failed to fetch shop.' }); //server error handling
    }
});
//GET shops detail
app.get("/shop/:shopId", async (req, res) => {
    const { shopId } = req.params; //Get the shopId string query
    try {
        const doc = await firebase_1.db.collection("shop").doc(shopId).get(); //get the shops collection data based on the ID
        //if the shop did not exist (wrong ID)
        if (!doc.exists) {
            res.status(404).json({ error: "Shop not found" }); //return 404 and error message
        }
        else {
            const productData = doc.data(); //get the shop data
            res.status(200).json(productData); //return 200 and display the data as JSON
        }
    }
    catch (error) {
        console.error(error); //display the error message
        res.status(500).json({ error: "Failed to fetch shop" }); //return 500 (error from server)
    }
});
//POST shop data
app.post('/shop', async (req, res) => {
    try {
        const { name, address, image, detail, rate } = req.body; //data from req.body
        //null checking
        if (!address || !image || !detail || !name || !rate) {
            res.status(400).json({ message: 'Please insert all data' });
        }
        //new data
        const newProduct = {
            address,
            image,
            detail,
            name,
            rate,
            createdAt: new Date(),
        };
        const docRef = await firebase_1.db.collection('shop').add(newProduct); //add new document to the collection
        res.status(201).json({ message: 'Shop created', id: docRef.id }); //success message
    }
    catch (error) {
        //error handling and send 500 code
        console.error('Error creating shop:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
//GET users data
app.get("/users", async (req, res) => {
    try {
        const snapshot = await firebase_1.db.collection('users').get(); //get the users collection
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })); //map the users
        res.status(200).json(users); //send the response as a JSON also with 200 code
    }
    catch (err) {
        console.error(err); //display the error
        res.status(500).json({ error: 'Failed to fetch users.' }); //server error handling
    }
});
//GET users detail
app.get("/users/:userId", async (req, res) => {
    const { userId } = req.params; //Get the shopId string query
    try {
        const doc = await firebase_1.db.collection("users").doc(userId).get(); //get the users collection data based on the ID
        //if the user did not exist (wrong ID)
        if (!doc.exists) {
            res.status(404).json({ error: "User not found" }); //return 404 and error message
        }
        else {
            const userData = doc.data(); //get the shop data
            res.status(200).json(userData); //return 200 and display the data as JSON
        }
    }
    catch (error) {
        console.log(error); //display the error message
        res.status(500).json({ error: "Failed to fetch user" }); //return 500 (error from server)
    }
});
//POST signup
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body; //signup data from req.body
    try {
        //create user record
        const userRecord = await firebase_admin_1.default.auth().createUser({
            email,
            password,
            displayName: username, //because username isn't a valid property for createUser
        });
        //set the users collection data (some data are null by default)
        await firebase_1.db.collection("users").doc(userRecord.uid).set({
            email,
            username,
            firstname: null,
            lastname: null,
            contactNumber: null,
            createdAt: new Date(),
            updatedAt: null,
            image: null
        });
        //save extra data to the firestore
        await firebase_1.db.collection("users").doc(userRecord.uid).set({
            email,
            username,
            createdAt: new Date()
        });
        res.status(201).json({ uid: userRecord.uid, email }); //The 201 Created HTTP status code indicates that the request was successful and resulted in the creation of a new resource
    }
    catch (err) {
        console.error(err); //display the error
    }
});
//POST - verify login token (must login first from front end, then send token to the backend)
app.post('/verify-token', async (req, res) => {
    const { idToken } = req.body; //Get the token id key from req.body
    try {
        const decoded = await firebase_admin_1.default.auth().verifyIdToken(idToken); //Decode/verify the token
        res.status(200).json({ uid: decoded.uid }); //Send 200 code and decoded uid
    }
    catch (error) {
        console.log(error); //display the error
        res.status(401).json({ error: "Invalid token" }); //Send 401 (Unauthorized/not logged in yet)
    }
});
//POST - Reset password
app.post("/request-password-reset", async (req, res) => {
    const { email } = req.body; //Get the email key from req.body
    try {
        const link = await firebase_admin_1.default.auth().generatePasswordResetLink(email); //Generate password reset link for corresponded email
        res.status(200).json({ message: "Reset link sent", link }); //Send 200 code, succeed message, and reset link
    }
    catch (error) {
        console.error(error); //Display error in the console
        res.status(400).json({ error: "Failed to update profile" }); //Send 400 (400 Bad Request) and error message
    }
});
//PUT Edit profile
app.put("/users/:uid", async (req, res) => {
    const { uid } = req.params; //get the uid
    const { username, firstname, lastname, contactNumber, email, password, image } = req.body; //get the data detail from the req.body 
    try {
        // Update auth data (if change happens)
        const authUpdateData = {}; //Empty object for store changed data to Firebase Auth
        //update only the selected data (use if statements to determine)
        //Auth data can only contains username, email, password. Other data will be stored in the firestore
        if (username)
            authUpdateData.displayName = username;
        if (email)
            authUpdateData.email = email;
        if (password)
            authUpdateData.password = password;
        //if authUpdateData not empty -> Means there's a change
        if (Object.keys(authUpdateData).length > 0) {
            await firebase_admin_1.default.auth().updateUser(uid, authUpdateData); //update the user data
        }
        // Update Firestore (auth data and other data such as firstname)
        const profileUpdateData = {
            updatedAt: new Date()
        }; //Empty object for store changed data to Firebase Auth
        /*
          Note: Firebase Auth for store auth data (username, email, password) - Firestore for store collection data
        */
        //update only the selected data (use if statements to determine)
        if (username)
            profileUpdateData.username = username;
        if (firstname)
            profileUpdateData.firstname = firstname;
        if (lastname)
            profileUpdateData.lastname = lastname;
        if (contactNumber)
            profileUpdateData.contactNumber = contactNumber;
        if (email)
            profileUpdateData.email = email;
        if (image)
            profileUpdateData.image = image;
        await firebase_1.db.collection('users').doc(uid).update(profileUpdateData); //Update users collection
        res.status(200).json({ message: "Profile updated" }); //Send 200 code and success message
    }
    catch (err) {
        console.error(err); //Display error in the console
        res.status(400).json({ error: "Failed to update profile" }); //Send 400 (400 Bad Request) and error message
    }
});
//POST Email subscription
app.post("/subscribe", async (req, res) => {
    const { email } = req.body; //Get the email key from req.body
    //If email empty
    if (!email) {
        res.status(400).json({ error: "Email is required" });
    }
    try {
        //Save to subscription collection
        await firebase_1.db.collection("subscriptions").add({
            email,
            subscirbeAt: new Date()
        });
        //kirim email welcome / konfirmasi
        const sendSmtpEmail = new brevo_1.SendSmtpEmail();
        //configure the sendSmtpEmail properties setting
        sendSmtpEmail.to = [{ email: email }]; //send email to
        sendSmtpEmail.sender = { email: "panjirajasap@gmail.com", name: "DS Book" }; //sender's email and name
        sendSmtpEmail.subject = "Subcription Successful"; //email subject
        sendSmtpEmail.htmlContent = `<html><body><h1>Thank you for subscribing!</h1></body></html>`; //email content
        await apiInstance.sendTransacEmail(sendSmtpEmail); //send the subscription email
        res.status(200).json({ message: "Subscription succesful" }); //Send 200 code and success message
    }
    catch (error) {
        console.log(error); //display the error
        res.status(500).json({ error: "Failed to subscribe" }); //server error handling
    }
});
// POST /carts/add
app.post("/carts/add", async (req, res) => {
    const { uid, productId, quantity } = req.body;
    if (!uid || !productId || !quantity) {
        res.status(400).json({ error: "User ID, product ID, and quantity required" });
        return;
    }
    try {
        // Menggunakan cartId yang unik berdasarkan kombinasi uid dan productId
        const cartId = `${uid}_${productId}`;
        // Mendapatkan info produk untuk disimpan di cart
        const productDoc = await firebase_1.db.collection("products").doc(productId).get();
        const product = productDoc.data();
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        await firebase_1.db.collection("carts").doc(cartId).set({
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
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to add item to cart" });
    }
});
// POST /orders/create
app.post("/orders/create", async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
        return res.status(400).json({ error: "User ID required" });
    }
    try {
        // 1. Ambil semua item di keranjang pengguna
        const cartSnapshot = await firebase_1.db.collection("carts").where("uid", "==", uid).get();
        if (cartSnapshot.empty) {
            return res.status(400).json({ error: "Cart is empty" });
        }
        // 2. Konversi data cart menjadi array item untuk order
        const items = [];
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
        const orderRef = await firebase_1.db.collection("orders").add({
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
        await firebase_1.db.collection("order_history").doc(orderRef.id).set({
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
    }
    catch (err) {
        console.error("Order error:", err);
        res.status(500).json({ error: "Failed to place order" });
    }
});
// GET /orders/history/:uid
app.get("/orders/history/:uid", async (req, res) => {
    const { uid } = req.params;
    if (!uid) {
        return res.status(400).json({ error: "User ID required" });
    }
    try {
        const historySnapshot = await firebase_1.db.collection("order_history")
            .where("userId", "==", uid)
            .orderBy("createdAt", "desc")
            .get();
        if (historySnapshot.empty) {
            return res.status(200).json({ orders: [] });
        }
        const orders = [];
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
    }
    catch (err) {
        console.error("Get order history error:", err);
        res.status(500).json({ error: "Failed to get order history" });
    }
});
// GET /orders/:orderId
app.get("/orders/:orderId", async (req, res) => {
    const { orderId } = req.params;
    if (!orderId) {
        return res.status(400).json({ error: "Order ID required" });
    }
    try {
        const orderDoc = await firebase_1.db.collection("orders").doc(orderId).get();
        if (!orderDoc.exists) {
            return res.status(404).json({ error: "Order not found" });
        }
        const orderData = orderDoc.data();
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
    }
    catch (err) {
        console.error("Get order details error:", err);
        res.status(500).json({ error: "Failed to get order details" });
    }
});
// Optional: Middleware to handle global mistake
app.use(async (req, res, next) => {
    res.status(500).json({ error: 'Something went wrong!' });
    next();
});
app.listen(PORT, function () { console.log(`It's alive on http://localhost:${PORT}`); }); //Set server port and display it to console
