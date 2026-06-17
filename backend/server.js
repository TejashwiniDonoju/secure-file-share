const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const File = require('./models/File');

const app = express();

// Deployment Environment Adjustments
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://tejashwinidonoju678_db_user:Teju2005@ac-gpu7pqh-shard-00-00.l1h00nq.mongodb.net:27017,ac-gpu7pqh-shard-00-01.l1h00nq.mongodb.net:27017,ac-gpu7pqh-shard-00-02.l1h00nq.mongodb.net:27017/dispatcher?ssl=true&replicaSet=atlas-o55f18-shard-0&authSource=admin&appName=Cluster0";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors());
app.use(express.json());

// Ensure the local uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 Successfully connected to MongoDB Database"))
  .catch(err => console.error("Database connection failure:", err));

// Multer Local Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

/**
 * ROUTE 1: FILE UPLOAD (Generates Public Shareable Link)
 */
/**
 * 🚀 ROUTE 1: UPLOAD & GENERATE 6-DIGIT PIN
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.body.password) return res.status(400).json({ error: "Missing file or password." });

    // Generate a completely random 6-digit code string
    let pinCode;
    let isUnique = false;
    while (!isUnique) {
      pinCode = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await File.findOne({ pinCode });
      if (!existing) isUnique = true; // Ensure code isn't being used by another active file
    }

    const hoursValid = parseInt(req.body.expiryHours) || 24;
    const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000);

    await File.create({
      originalName: req.file.originalname,
      path: req.file.path,
      password: req.body.password, 
      pinCode,
      downloadLimit: parseInt(req.body.downloadLimit) || 5,
      expiresAt
    });

    // Return the simple pin code to the sender
    res.status(200).json({ pinCode });
  } catch (error) {
    res.status(500).json({ error: "Upload failed." });
  }
});

/**
 * 🔍 ROUTE 2: VERIFY THE PIN-CODE EXISTENCE
 */
app.get('/api/verify-pin/:pin', async (req, res) => {
  try {
    const file = await File.findOne({ pinCode: req.params.pin });
    if (!file) return res.status(404).json({ error: "Invalid or expired Pin Code." });

    if (new Date() > file.expiresAt) return res.status(410).json({ error: "This pin has expired." });
    if (file.downloadCount >= file.downloadLimit) return res.status(403).json({ error: "Download quota reached." });

    res.json({ originalName: file.originalName });
  } catch (error) {
    res.status(500).json({ error: "Verification failed." });
  }
});

/**
 * 🔓 ROUTE 3: AUTHENTICATE PASSWORD & STREAM FILE USING PIN
 */
app.post('/api/download-by-pin/:pin', async (req, res) => {
  try {
    const file = await File.findOne({ pinCode: req.params.pin });
    if (!file) return res.status(404).json({ error: "File not found." });

    if (new Date() > file.expiresAt || file.downloadCount >= file.downloadLimit) {
      return res.status(403).json({ error: "Access rules violated (Expired or quota hit)." });
    }

    if (file.password !== req.body.password) {
      return res.status(401).json({ error: "Incorrect file password." });
    }

    file.downloadCount += 1;
    await file.save();

    res.download(file.path, file.originalName);
  } catch (error) {
    res.status(500).json({ error: "Download breakdown." });
  }
});

/**
 * HOURLY AUTOMATED CLEANUP ROUTINE (Background Garbage Collector)
 */
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Running database storage sweep cleanup...');
  try {
    const expiredFiles = await File.find({ expiresAt: { $lt: new Date() } });
    for (const file of expiredFiles) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path); 
      }
      await File.findByIdAndDelete(file._id); 
    }
    if (expiredFiles.length > 0) console.log(`🧹 Purged ${expiredFiles.length} expired file entries.`);
  } catch (err) {
    console.error("Cron Error:", err);
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`🚀 System up and responding on Port: ${PORT}`));
/**
 * 📊 ROUTE 4: SECURE SENDER HISTORY LOGS (Verifies password before showing data)
 */
app.post('/api/file-history', async (req, res) => {
  try {
    const { fileId, password } = req.body;
    if (!fileId || !password) return res.status(400).json({ error: "Missing required lookup details." });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: "No records found for this File ID." });

    // Enforce authorization: only show analytics if password matches
    if (file.password !== password) {
      return res.status(401).json({ error: "Unauthorized access key. Access Denied." });
    }

    // Return the full analytical track record back to the sender
    res.json({
      originalName: file.originalName,
      downloadCount: file.downloadCount,
      downloadLimit: file.downloadLimit,
      createdAt: file.createdAt,
      expiresAt: file.expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: "Server error compiling history data." });
  }
});