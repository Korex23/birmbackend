const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const mammoth = require("mammoth");
const cors = require("cors");

// Create express app
const app = express();
app.use(cors());

const port = 3000;

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp to avoid file name collisions
  },
});

const upload = multer({ storage });

// Ensure the upload folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Endpoint to convert Word document to PDF
app.post("/convert-to-pdf", upload.single("wordDocument"), async (req, res) => {
  try {
    const docPath = req.file.path;
    const outputPdfPath = `uploads/${Date.now()}.pdf`;

    // Convert the DOCX to HTML using Mammoth
    const { value: html } = await mammoth.convertToHtml({ path: docPath });

    // Launch Puppeteer and convert HTML to PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    await page.pdf({ path: outputPdfPath, format: "A4" });

    await browser.close();

    // Send the PDF as a response
    res.sendFile(path.resolve(outputPdfPath), (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).send("Error sending file");
      } else {
        // Clean up uploaded DOCX and generated PDF files
        fs.unlinkSync(docPath);
        fs.unlinkSync(outputPdfPath);
      }
    });
  } catch (error) {
    console.error("Error during conversion:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
