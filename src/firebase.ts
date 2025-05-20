import admin from "firebase-admin";
import fs from "fs";
import path from "path";

//Absolute path to the JSON key
const serviceAccountPath = path.resolve(__dirname, "../secrets/firebase-key.json");

//Read the file and parse the JSON
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

//initialize app
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export const db = admin.firestore();