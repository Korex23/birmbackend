const express = require("express");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

// const fileCompressionRoutes = require("./fileCompression"); // Import the new file

const app = express();
app.use(cors());
const port = 5000;

// Initialize Firebase Admin SDK
const serviceAccount = require("./birmkey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Set up Nodemailer for sending emails
const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "birmbook@gmail.com",
    pass: "cxkzmevzhyalnyyl",
  },
});

// Store verification codes temporarily
const verificationCodes = {};

// Function to send authentication verification email
const sendAuthMail = async (email) => {
  try {
    const actionCodeSettings = {
      url: "https://localhost:5173/signin",
      handleCodeInApp: true,
    };

    const verificationLink = await admin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings);

    const mailOptions = {
      from: "birmbook@gmail.com",
      to: email,
      subject: "Confirm Your Email for BlessedBirm",
      text: `Hi there,

Welcome to BlessedBirm! Please verify your email by clicking the link below:

${verificationLink}

If you didn’t sign up, ignore this email.

- The BlessedBirm Team`,
      html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};

// Function to send verification code for institution affiliation
const sendVerificationCode = async (email, institution) => {
  try {
    const verificationCode = Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();
    verificationCodes[email] = verificationCode;

    const mailOptions = {
      from: "birmbook@gmail.com",
      to: email,
      subject: `Verify Your ${institution} Affiliation for BlessedBirm`,
      text: `Your verification code is: ${verificationCode}`,
      html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Verification code sent successfully");
  } catch (error) {
    console.error("Error sending verification code:", error);
  }
};

// Routes for email verification
app.post("/send-auth-mail", express.json(), (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  sendAuthMail(email)
    .then(() => res.status(200).json({ message: "Verification email sent" }))
    .catch((error) => res.status(500).json({ error: error.message }));
});

app.post("/send-verification-code", express.json(), (req, res) => {
  const { email, institution } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  sendVerificationCode(email, institution)
    .then(() => res.status(200).json({ message: "Verification code sent" }))
    .catch((error) => res.status(500).json({ error: error.message }));
});

app.post("/verify-code", express.json(), (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: "Email and code are required" });

  if (verificationCodes[email] === code) {
    delete verificationCodes[email];
    return res.status(200).json({ message: "Code verified successfully" });
  } else {
    return res.status(400).json({ error: "Invalid verification code" });
  }
});

// Import file compression routes
// app.use("/", fileCompressionRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
