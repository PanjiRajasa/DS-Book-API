"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/authRoutes.ts
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// Endpoint untuk mengirim link reset password
router.post('/send-reset-password-email', authController_1.sendPasswordResetEmail);
exports.default = router;
