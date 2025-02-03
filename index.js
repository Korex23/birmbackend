const express = require("express");
const admin = require("firebase-admin");
const path = require("path");
const nodemailer = require("nodemailer");
const fs = require("fs");
const ILovePDF = require("@ilovepdf/ilovepdf-nodejs");
const multer = require("multer");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
const port = 5000;

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "/"),
    filename: (req, file, cb) => {
      cb(null, `${uuidv4()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const ilovepdf = new ILovePDF(
  process.env.ILOVEPDF_PUBLIC_KEY,
  process.env.ILOVEPDF_SECRET_KEY
);

// Initialize Firebase Admin SDK
const serviceAccount = require("./birmbook-2194f-firebase-adminsdk-qga2f-df42563aee.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Set up Nodemailer to send verification emails
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

// Store verification codes temporarily (in memory for simplicity)
const verificationCodes = {}; // This will store email and their corresponding codes

// Function to send the authentication verification email with a code
const sendAuthMail = async (email) => {
  try {
    const actionCodeSettings = {
      url: "https://blessedbirm.com/signin", // Redirect URL after verification
      handleCodeInApp: true, // Whether to handle the link in your app
    };

    // Generate the email verification link
    const verificationLink = await admin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings);

    // Send the verification email using Nodemailer
    const mailOptions = {
      from: "birmbook@gmail.com",
      to: email,
      subject: "Confirm Your Email for BlessedBirm",
      text: `Hi there,

Welcome to BlessedBirm! We're excited to have you on board. Please verify your email address to complete your registration. 

Click the link below to verify your email:
${verificationLink}

If you didn’t sign up for BlessedBirm, please ignore this email.

Thank you for joining us,
The BlessedBirm Team`,
      html: `
  <div style="font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
      <h2 style="color: #005097; text-align: center;">Welcome to BlessedBirm!</h2>
      <p>Hi there,</p>
      <p>We're excited to have you join our community! To complete your registration, please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${verificationLink}" style="display: inline-block; text-decoration: none; padding: 12px 20px; background-color: #005097; color: #fff; border-radius: 6px; font-size: 16px;">Verify Email</a>
      </div>
      <p>If the button above doesn’t work, you can also verify your email using the link below:</p>
      <p style="word-break: break-word;"><a href="${verificationLink}" style="color: #005097;">${verificationLink}</a></p>
      <p>If you didn’t sign up for BlessedBirm, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 20px 0;">
      <p style="text-align: center; color: #777;">Thank you for joining us!<br>The BlessedBirm Team</p>
    </div>
  </div>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};

// Function to send the authentication verification email with a code
const sendVerificationCode = async (email, institution) => {
  try {
    // Generate a random verification code
    const verificationCode = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase(); // Generate 6-digit code

    // Store the code temporarily (you can use a more persistent storage like a database)
    verificationCodes[email] = verificationCode;

    // Send the verification email using Nodemailer
    const mailOptions = {
      from: "birmbook@gmail.com",
      to: email,
      subject: `Verify Your ${institution} Affiliation for BlessedBirm`,
      text: `Hi there,

We’ve received a request to verify your affiliation with ${institution} for BlessedBirm. 

Please use the following verification code to confirm your ${institution} affiliation:

Verification Code: ${verificationCode}

If you didn’t request this verification or are not affiliated with ${institution}, please ignore this email.

Thank you for being part of BlessedBirm,
The BlessedBirm Team`,
      html: `
  <div style="font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
      <h2 style="color: #005097; text-align: center;">Verify Your ${institution} Affiliation for BlessedBirm</h2>
      <p>Hi there,</p>
      <p>We’ve received a request to verify your affiliation with ${institution} for BlessedBirm. Please use the following verification code to confirm your affiliation:</p>
      <div style="text-align: center; margin: 20px 0;">
        <h3 style="font-size: 24px; color: #005097;">${verificationCode}</h3>
      </div>
      <p>If you didn’t request this verification or are not affiliated with institution, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 20px 0;">
      <p style="text-align: center; color: #777;">Thank you for being part of BlessedBirm!<br>The BlessedBirm Team</p>
    </div>
  </div>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Verification code sent successfully");
  } catch (error) {
    console.error("Error sending verification code:", error);
  }
};

// Route to send the verification code
app.post("/send-verification-code", express.json(), (req, res) => {
  const { email, institution } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  sendVerificationCode(email, institution)
    .then(() => res.status(200).json({ message: "Verification code sent" }))
    .catch((error) => res.status(500).json({ error: error.message }));
});

// Route to send the authentication email
app.post("/send-auth-mail", express.json(), (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  sendAuthMail(email)
    .then(() => res.status(200).json({ message: "Verification email sent" }))
    .catch((error) => res.status(500).json({ error: error.message }));
});

// Route to verify the entered code
app.post("/verify-code", express.json(), (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }

  // Check if the code matches the one stored
  const storedCode = verificationCodes[email];
  if (!storedCode) {
    return res
      .status(400)
      .json({ error: "No verification code found for this email" });
  }

  if (storedCode === code) {
    // Successfully verified, delete the code from memory
    delete verificationCodes[email];
    return res.status(200).json({ message: "Code verified successfully" });
  } else {
    return res.status(400).json({ error: "Invalid verification code" });
  }
});

app.post("/compress-pdf", upload.single("file"), async (req, res) => {
  let tempFilePath = "";

  try {
    if (!req.file) {
      console.log("here");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Received file:", req.file);

    // Validate PDF MIME type (adjust this if you expect slight variations)
    if (req.file.mimetype !== "application/pdf") {
      throw new Error("Only PDF files are allowed");
    }

    // Save the temporary file path from multer
    tempFilePath = path.resolve(__dirname, req.file.path);
    console.log("Using temporary file:", { tempFilePath });

    // Initialize and start the compression task
    const task = ilovepdf.newTask("compress");

    await task.start();
    console.log("Task started with ID:", { task });

    console.log("Using temporary file:", { tempFilePath });

    // Add file using the temporary file path

    const t = await task.addFile(tempFilePath);
    console.log("File added successfully to task:", { key: task.files, t });

    // Process the task using the recommended compression level
    await task.process({ compression_level: "recommended" });
    console.log("Processing completed. Task status:", task.status);

    // Ensure the task was successful (verify the status string as per SDK docs)
    if (task.status !== "TaskSuccess") {
      throw new Error(`Compression failed with status: ${task.status}`);
    }

    // Download the result
    const result = await task.download();
    console.log("Download completed. Result size:", result.length);

    // Validate the downloaded result (ensuring it is a buffer and above a minimal size)
    if (!Buffer.isBuffer(result) || result.length < 1024) {
      throw new Error("Invalid compressed file received");
    }

    // Set headers and send the compressed PDF to the client
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="compressed_${req.file.originalname}"`,
      "Content-Length": result.length,
    });
    res.send(result);
  } catch (error) {
    console.error("Error processing PDF:", {
      message: error.message,
      stack: error.stack,
      apiError: error.response?.data || error.apiError,
    });

    res.status(500).json({
      error: "PDF processing failed",
      details: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  } finally {
    // Asynchronously clean up the temporary file, if it exists
    if (tempFilePath) {
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
          console.log("Cleaned up temporary file:", tempFilePath);
        }
      } catch (cleanupError) {
        console.error(
          "Failed to clean up temporary file:",
          tempFilePath,
          cleanupError
        );
      }
    }
  }
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
