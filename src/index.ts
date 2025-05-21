import express, { Request, Response } from "express";
import { db } from "./firebase";
import admin from "firebase-admin";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";

//Basic configuration
const app = express();
const PORT = 3000;
dotenv.config();
app.use(express.json());

//Brevo configuration
dotenv.config();

//we use JS syntax instead so if an error occurs, we can fix it easy (the documentation write in JS syntax)
const SibApiV3Sdk = require('sib-api-v3-sdk'); //require the sib-api-v3-sdk
const defaultClient = SibApiV3Sdk.ApiClient.instance; //default client
const apiKey = defaultClient.authentications['api-key']; //authentication type
apiKey.apiKey = process.env.BREVO_API_KEY; //API key that stored in the .env
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi(); //Make API instance

// Parse application/json
app.use(bodyParser.json());

// Optional: Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

//middleware logging
app.use(function(req, res, next) {
    console.log(`request method: ${req.method}`);
    console.log(`request was made: ${req.url}`);

    next();
});


//GET products
app.get("/products", async (req, res) => {
  try {
    const snapshot = await db.collection('products').get(); //get the products collection

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })); //map the product

    res.status(200).json(products); //send the response as a JSON also with 200 code
  } catch(err) {
    console.error(err); //display the error
    res.status(500).json({ error: 'Failed to fetch products.' }); //server error handling
  }
});

//GET detail products
app.get("/products/:productId", async (req, res) => {
  const {productId} = req.params; //Get the productId string query

  try {
    const doc = await db.collection("products").doc(productId).get(); //get the products collection data based on the ID

    //if the prodcut did not exist (wrong ID)
    if(!doc.exists) {
      
      res.status(404).json({error: "Product not found"}); //return 404 and error message

    } else {

      const productData = doc.data(); //get the products data
      res.status(200).json(productData); //return 200 and display the data as JSON

    }

  } catch (error) {

    console.error(error); //display the error message
    res.status(500).json({ error: "Failed to fetch product" }); //return 500 (error from server)

  }
});

//GET shops data
app.get("/shop", async (req, res) => {
  try {
    const snapshot = await db.collection('shop').get(); //get the shop collection

    const shop = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })); //map the shop

    res.status(200).json(shop); //send the response as a JSON also with 200 code

  } catch(err) {

    console.error(err); //display the error
    res.status(500).json({ error: 'Failed to fetch shop.' }); //server error handling

  }
});

//GET shops detail
app.get("/shop/:shopId", async (req, res) => {
  const {shopId} = req.body; //Get the shopId string query
});

//POST signup
app.post("/signup", async (req, res) => {
  const {username, email, password} = req.body; //signup data from req.body
  try {
    //create user record
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username, //because username isn't a valid property for createUser
    });

    //set the users collection data (some data are null by default)
    await db.collection("users").doc(userRecord.uid).set({
      email,
      username,
      firstname: null,
      lastname: null,
      contactNumber: null,
      createdAt: new Date(),
      updatedAt: null
    });

    //save extra data to the firestore
    await db.collection("users").doc(userRecord.uid).set({
      email,
      username,
      createdAt: new Date()
    });

    res.status(201).json({ uid: userRecord.uid, email}); //The 201 Created HTTP status code indicates that the request was successful and resulted in the creation of a new resource

  } catch(err) {
    console.error(err); //display the error

  }
});

//POST - verify login token (must login first from front end, then send token to the backend)
app.post('/verify-token', async (req, res) => {
  const {idToken} = req.body; //Get the token id key from req.body

  try {
    const decoded = await admin.auth().verifyIdToken(idToken); //Decode/verify the token

    res.status(200).json({uid: decoded.uid}); //Send 200 code and decoded uid

  } catch (error) {
    console.log(error); //display the error
    res.status(401).json({error: "Invalid token"}); //Send 401 (Unauthorized/not logged in yet)
  }
});

//POST - Reset password
app.post("/request-password-reset", async (req, res) => {
  const {email} = req.body; //Get the email key from req.body

  try {
    
    const link = await admin.auth().generatePasswordResetLink(email); //Generate password reset link for corresponded email

    res.status(200).json({ message: "Reset link sent", link }); //Send 200 code, succeed message, and reset link
  } catch (error) {

    console.error(error); //Display error in the console
    res.status(400).json({ error: "Failed to update profile" }); //Send 400 (400 Bad Request) and error message

  }
});

//PUT Edit profile
app.put("/users/:uid", async (req, res) => {
  const { uid } = req.params; //get the uid
  const { username, firstname, lastname, contactNumber, email, password } = req.body; //get the data detail from the req.body 

  try {
    // Update data (if change happens)
    const authUpdateData: admin.auth.UpdateRequest = {}; //Empty object for store changed data to Firebase Auth

    //update only the selected data (use if statements to determine)
    if (username) authUpdateData.displayName = username;
    if (email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;

    //if authUpdateData not empty -> Means there's a change
    if (Object.keys(authUpdateData).length > 0) {
      await admin.auth().updateUser(uid, authUpdateData); //update the user data
    }

    // Update Firestore
    const profileUpdateData: any = {
      updatedAt: new Date()
    }; //Empty object for store changed data to Firebase Auth

    /*
      Note: Firebase Auth for store auth data (username, email, password) - Firestore for store collection data
    */

    //update only the selected data (use if statements to determine)
    if (username) profileUpdateData.username = username;
    if (firstname) profileUpdateData.firstname = firstname;
    if (lastname) profileUpdateData.lastname = lastname;
    if (contactNumber) profileUpdateData.contactNumber = contactNumber;
    if (email) profileUpdateData.email = email;

    await db.collection('users').doc(uid).update(profileUpdateData); //Update users collection

    res.status(200).json({ message: "Profile updated" }); //Send 200 code and success message

  } catch (err) {

    console.error(err); //Display error in the console
    res.status(400).json({ error: "Failed to update profile" }); //Send 400 (400 Bad Request) and error message

  }
});

//POST Email subscription
app.post("/subscribe", async (req, res) => {
  const {email} = req.body; //Get the email key from req.body

  //If email empty
  if(!email) {
    res.status(400).json({error: "Email is required"});
  }

  try {

    //Save to subscription collection
    await db.collection("subscriptions").add({
      email,
      subscirbeAt: new Date()
    });

    //kirim email welcome / konfirmasi
    const sendSmtpEmail = new SendSmtpEmail();
    
    //configure the sendSmtpEmail properties setting
    sendSmtpEmail.to = [{email: email}]; //send email to
    sendSmtpEmail.sender = {email: "panjirajasap@gmail.com", name: "DS Book"}; //sender's email and name
    sendSmtpEmail.subject = "Subcription Successful"; //email subject
    sendSmtpEmail.htmlContent = `<html><body><h1>Thank you for subscribing!</h1></body></html>`; //email content

    await apiInstance.sendTransacEmail(sendSmtpEmail); //send the subscription email
    
    res.status(200).json({message: "Subscription succesful"}); //Send 200 code and success message
  } catch (error) {

    console.log(error); //display the error
    res.status(500).json({error: "Failed to subscribe"}); //server error handling

  }
});

app.listen(PORT, function() {console.log(`It's alive on http://localhost:${PORT}`)}); //Set server port and display it to console