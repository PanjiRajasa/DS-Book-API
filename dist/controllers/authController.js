"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = void 0;
const admin = __importStar(require("firebase-admin")); // Pastikan `admin` diimpor dari tempat yang sudah diinisialisasi
const nodemailer_1 = __importDefault(require("nodemailer")); // Anda perlu menginstal nodemailer
const sendPasswordResetEmail = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    try {
        // 1. Buat link reset password menggunakan Firebase Admin SDK
        const link = await admin.auth().generatePasswordResetLink(email);
        // 2. Sekarang, Anda harus mengirim 'link' ini ke email pengguna.
        // Firebase Admin SDK TIDAK mengirim email secara langsung.
        // Anda perlu menggunakan layanan pengiriman email eksternal di sini.
        // Contoh placeholder (Anda perlu menggantinya dengan implementasi nyata):
        console.log(`Password reset link generated for ${email}: ${link}`);
        // Contoh sederhana:
        // await sendEmailService(email, 'Reset Your Password', `Click here to reset your password: ${link}`);
        // Contoh placeholder yang lebih baik (menggunakan Nodemailer sebagai ilustrasi):
        // Konfigurasi transporter email Anda (contoh menggunakan Gmail)
        const transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: 'rajasa220807@gmail.com', // Ganti dengan email Anda
                pass: 'zyhg qbsa pabo spsi' // Ganti dengan password aplikasi/OAuth Anda
            }
        });
        const mailOptions = {
            from: 'rajasa220807@gmail.com',
            to: email,
            subject: 'Reset Password Anda',
            html: `<p>Klik tautan ini untuk mereset password Anda: <a href="${link}">${link}</a></p>`
        };
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: 'Password reset link generated. Please check your email.', linkSentTo: email });
    }
    catch (error) {
        console.error('Error generating password reset link:', error);
        // Tangani berbagai jenis error dari Firebase Auth
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ message: 'User with that email not found.' });
        }
        if (error.code === 'auth/invalid-email') {
            return res.status(400).json({ message: 'Invalid email address.' });
        }
        // Beberapa error lain yang mungkin terjadi saat generate link:
        // auth/user-disabled
        // auth/missing-android-package-name
        // auth/missing-ios-bundle-id
        // auth/invalid-continue-uri
        // auth/unauthorized-domain
        return res.status(500).json({ message: 'Failed to generate password reset link.', error: error.message });
    }
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
