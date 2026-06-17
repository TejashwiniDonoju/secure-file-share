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
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please attach a file." });
    if (!req.body.password) return res.status(400).json({ error: "Password protection is required." });

    const hoursValid = parseInt(req.body.expiryHours) || 24;
    const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000);
    const downloadLimit = parseInt(req.body.downloadLimit) || 5;

    const newFile = await File.create({
      originalName: req.file.originalname,
      path: req.file.path,
      password: req.body.password, 
      downloadLimit,
      expiresAt
    });

    res.status(200).json({ 
      fileId: newFile._id,
      downloadLink: `${FRONTEND_URL}/download/${newFile._id}`
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Processing Error." });
  }
});

/**
 * ROUTE 2: FETCH FILE METADATA (Link Verification Engine)
 */
app.get('/api/file-info/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "Link expired or does not exist." });

    if (new Date() > file.expiresAt) return res.status(410).json({ error: "This file link has expired." });
    if (file.downloadCount >= file.downloadLimit) return res.status(403).json({ error: "Download quota reached." });

    res.json({ originalName: file.originalName, requiresPassword: true });
  } catch (error) {
    res.status(500).json({ error: "Invalid link signature parameter." });
  }
});

/**
 * ROUTE 3: PASSWORD VALIDATION & DATA DISPATCH
 */
app.post('/api/download/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "Resource not found." });

    if (new Date() > file.expiresAt) return res.status(410).json({ error: "This file link has expired." });
    if (file.downloadCount >= file.downloadLimit) return res.status(403).json({ error: "Download threshold met." });

    // Verify Password Match
    if (file.password !== req.body.password) {
      return res.status(401).json({ error: "Incorrect password. Access denied." });
    }

    // Process tracking data
    file.downloadCount += 1;
    await file.save();

    // Trigger physical file download payload download stream
    res.download(file.path, file.originalName);
  } catch (error) {
    res.status(500).json({ error: "System failure executing target download." });
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