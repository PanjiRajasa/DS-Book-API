import express, { Request, Response, IRouter } from "express";
import { db } from "../firebase";
import admin from "firebase-admin";
import dotenv from "dotenv";
import { SendSmtpEmail } from "@getbrevo/brevo";
import * as brevo from "@getbrevo/brevo";

const router: IRouter = express.Router();
dotenv.config(); //Manage environemnt variable from .env file

//Brevo configuration
//we use JS syntax instead so if an error occurs, we can fix it easy (the documentation write in JS syntax)
const SibApiV3Sdk = require('sib-api-v3-sdk'); //require the sib-api-v3-sdk
const defaultClient = SibApiV3Sdk.ApiClient.instance; //default client
const apiKey = defaultClient.authentications['api-key']; //authentication type
apiKey.apiKey = process.env.BREVO_API_KEY; //API key that stored in the .env
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi(); //Make API instance


//GET users data
router.get("/", async (req: Request, res: Response): Promise<void> => {
    try {
        const snapshot = await db.collection('users').get(); //get the users collection

        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })); //map the users

        res.status(200).json(users); //send the response as a JSON also with 200 code
    } catch (err) {
        console.error(err); //display the error
        res.status(500).json({ error: 'Failed to fetch users.' }); //server error handling
    }
});

//GET users detail
interface User {
    userId: string,
};

router.get("/:userId", async (req: Request<User>, res: Response): Promise<any> => {

    const { userId } = req.params; //Get the shopId string query

    try {

        const doc = await db.collection("users").doc(userId).get(); //get the users collection data based on the ID

        //if the user did not exist (wrong ID)
        if (!doc.exists) {

            res.status(404).json({ error: "User not found" }); //return 404 and error message

        } else {

            const userData = doc.data(); //get the shop data
            res.status(200).json(userData); //return 200 and display the data as JSON

        }

    } catch (error) {

        console.log(error); //display the error message
        res.status(500).json({ error: "Failed to fetch user" }); //return 500 (error from server)

    }
});

//POST signup
interface UserSignUp {
    username: string,
    email: string,
    password: string
}

router.post("/signup", async (req: Request<UserSignUp>, res: Response): Promise<any> => {

    const { username, email, password } = req.body; //signup data from req.body

    if(!username || !email || !password) {
        return res.status(400).json({error: "Username, Email, and Password are required."});
    }

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
            updatedAt: null,
            image: null
        });

        res.status(201).json({ uid: userRecord.uid, email }); //The 201 Created HTTP status code indicates that the request was successful and resulted in the creation of a new resource

    } catch (error) {
        const err = error as any;

        console.error("Error during signup: " + error); //display the error

        if(err.code == "auth/email-already-in-use") {
            return res.status(409).json({error: "Email already registered. Please use a different email or log in."});
        }

        return res.status(500).json({error: err.message || "Internal server error"});
    }
});

//POST - verify login token (must login first from front end, then send token to the backend)
router.post('/verify-token', async (req: Request, res: Response): Promise<any> => {

    const { idToken } = req.body; //Get the token id key from req.body

    if(!idToken) {
        return res.status(400).json({error: "Token is required"});
    }

    try {
        const decoded = await admin.auth().verifyIdToken(idToken); //Decode/verify the token

        res.status(200).json({ uid: decoded.uid }); //Send 200 code and decoded uid

    } catch (error) {
        console.log('Token verification failed:', error); //display the error
        res.status(401).json({ error: "Invalid token" }); //Send 401 (Unauthorized/not logged in yet)
    }
});

//POST - Reset password
interface EmailReset {
    email: string
}

router.post("/request-password-reset", async (req: Request<EmailReset>, res: Response): Promise<any> => {
    const { email } = req.body; //Get the email key from req.body

    try {

        const link = await admin.auth().generatePasswordResetLink(email); //Generate password reset link for corresponded email

        res.status(200).json({ message: "Reset link sent", link }); //Send 200 code, succeed message, and reset link
    } catch (error) {

        console.error(error); //Display error in the console
        res.status(400).json({ error: "Failed to update profile" }); //Send 400 (400 Bad Request) and error message

    }
});

//PUT Edit profile
//PUT Edit profile
router.put("/:uid", async (req, res): Promise<any> => {
    const { uid } = req.params;
    const { username, firstname, lastname, contactNumber, email, password, image } = req.body;

    // Debug logging
    console.log("=== PUT /users/:uid DEBUG ===");
    console.log("UID from params:", uid);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Content-Type:", req.get('Content-Type'));
    console.log("Request method:", req.method);
    console.log("============================");

    // Validation
    if (!uid) {
        console.log("ERROR: No UID provided");
        return res.status(400).json({ error: "User ID is required" });
    }

    if (!username && !firstname && !lastname && !contactNumber && !email && !password && !image) {
        console.log("ERROR: No data provided for update");
        return res.status(400).json({ error: "At least one field must be provided for update" });
    }

    try {
        // Update auth data (if change happens)
        const authUpdateData: admin.auth.UpdateRequest = {};

        if (username && username.trim().length > 0) {
            console.log("Will update displayName to:", username);
            authUpdateData.displayName = username;
        }
        if (email && email.trim().length > 0) {
            console.log("Will update email to:", email);
            authUpdateData.email = email;
        }
        if (password && password.trim().length > 0) {
            console.log("Will update password (length):", password.length);
            authUpdateData.password = password;
        }

        // Update Firebase Auth if needed
        if (Object.keys(authUpdateData).length > 0) {
            console.log("Updating Firebase Auth with:", Object.keys(authUpdateData));
            await admin.auth().updateUser(uid, authUpdateData);
            console.log("Firebase Auth updated successfully");
        } else {
            console.log("No Firebase Auth updates needed");
        }

        // Update Firestore
        const profileUpdateData: any = {
            updatedAt: new Date()
        };

        if (username && username.trim().length > 0) profileUpdateData.username = username;
        if (firstname && firstname.trim().length > 0) profileUpdateData.firstname = firstname;
        if (lastname && lastname.trim().length > 0) profileUpdateData.lastname = lastname;
        if (contactNumber && contactNumber.trim().length > 0) profileUpdateData.contactNumber = contactNumber;
        if (email && email.trim().length > 0) profileUpdateData.email = email;
        if (image && image.trim().length > 0) profileUpdateData.image = image;

        console.log("Updating Firestore with:", JSON.stringify(profileUpdateData, null, 2));
        await db.collection('users').doc(uid).update(profileUpdateData);
        console.log("Firestore updated successfully");

        res.status(200).json({ message: "Profile updated successfully" });

    } catch (err: any) {
        console.error('=== UPDATE PROFILE ERROR ===');
        console.error('Error type:', err.constructor.name);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
        console.error('============================');

        // More specific error handling
        if (err.code === 'auth/user-not-found') {
            return res.status(404).json({ error: "User not found" });
        }
        if (err.code === 'auth/email-already-in-use') {
            return res.status(409).json({ error: "Email already in use" });
        }
        if (err.code === 'auth/invalid-email') {
            return res.status(400).json({ error: "Invalid email format" });
        }
        if (err.code === 'auth/weak-password') {
            return res.status(400).json({ error: "Password is too weak" });
        }

        res.status(500).json({ 
            error: "Failed to update profile", 
            details: err.message,
            code: err.code 
        });
    }
});


//POST Email subscription
router.post("/subscribe", async (req, res): Promise<any> => {
    const { email } = req.body; //Get the email key from req.body
    
    //If email empty
    if (!email) {
        return res.status(400).json({ error: "Email is required" }); // Tambahkan return
    }
    
    try {
        //Save to subscription collection
        await db.collection("subscriptions").add({
            email,
            subcribeAt: new Date()
        });
        
        res.status(200).json({ message: "Subscription successful" });
        
    } catch (error) {
        const err = error as any;

        console.error('Error details:', error);
        
        res.status(500).json({ error: "Failed to subscribe" });
    }
});

export default router;