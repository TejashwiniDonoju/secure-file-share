const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const bcrypt = require('bcryptjs'); // For hashing passwords
const jwt = require('jsonwebtoken'); // For secure session tokens

const File = require('./models/File');
const User = require('./models/User'); // Import our new User Model

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://tejashwinidonoju678_db_user:Teju2005@ac-gpu7pqh-shard-00-00.l1h00nq.mongodb.net:27017,ac-gpu7pqh-shard-00-01.l1h00nq.mongodb.net:27017,ac-gpu7pqh-shard-00-02.l1h00nq.mongodb.net:27017/dispatcher?ssl=true&replicaSet=atlas-o55f18-shard-0&authSource=admin&appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_TOKEN_KEY_DROPVAULT";

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 Successfully connected to MongoDB Database"))
  .catch(err => console.error("Database connection failure:", err));

io.on('connection', (socket) => {
  console.log(`📡 User linked to WebSocket: ${socket.id}`);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Render Health Check Base Endpoint
app.get('/', (req, res) => {
  res.send('Backend Server is running successfully with Authentication!');
});

/**
 * 🔒 SECURITY MIDDLEWARE: Verifies if the request has a valid logged-in user token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: "Access denied. Please log in first." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Session expired. Please log in again." });
    req.user = user; // Adds user details (id) directly into the request object
    next();
  });
};

/**
 * 🔑 AUTH ROUTE 1: USER REGISTRATION (SIGNUP)
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required." });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: "An account with this email already exists." });

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: "Account created successfully! You can now log in." });
  } catch (error) {
    res.status(500).json({ error: "Registration failed." });
  }
});

/**
 * 🔑 AUTH ROUTE 2: USER LOGIN
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password." });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid email or password." });

    // Generate a secure session token valid for 7 days
    const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, username: user.name });
  } catch (error) {
    res.status(500).json({ error: "Login failed." });
  }
});

/**
 * 🚀 AUTHENTICATED ROUTE 3: UPLOAD & LINK TO SENDER ID
 */
app.post('/api/upload', authenticateToken, upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files received." });

    let pinCode;
    let isUnique = false;
    while (!isUnique) {
      pinCode = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await File.findOne({ pinCode });
      if (!existing) isUnique = true;
    }

    let finalZipName = `bundle-${Date.now()}-${pinCode}.zip`;
    let finalZipPath = path.join(uploadDir, finalZipName);

    const outputStream = fs.createWriteStream(finalZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    outputStream.on('close', async () => {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });

      const hoursValid = parseInt(req.body.expiryHours) || 24;
      const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000);

      // 🔥 FIXED: File is now saved permanently linked to the logged-in user's account ID!
      await File.create({
        originalName: req.files.length === 1 ? req.files[0].originalname : `Files_Bundle_${pinCode}.zip`,
        path: finalZipPath,
        pinCode,
        downloadLimit: parseInt(req.body.downloadLimit) || 5,
        expiresAt,
        senderId: req.user.id 
      });

      res.status(200).json({ pinCode });
    });

    archive.on('error', (err) => { throw err; });
    archive.pipe(outputStream);

    req.files.forEach(file => {
      archive.file(file.path, { name: file.originalname });
    });
    
    await archive.finalize();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Bundling system failed." });
  }
});

/**
 * 📥 PUBLIC ROUTE 4: DIRECT DOWNLOAD BY PIN (No Auth needed for recipients!)
 */
app.get('/api/download-by-pin/:pin', async (req, res) => {
  try {
    const file = await File.findOne({ pinCode: req.params.pin });
    if (!file) return res.status(404).json({ error: "File collection invalid or expired." });

    if (new Date() > file.expiresAt || file.downloadCount >= file.downloadLimit) {
      return res.status(403).json({ error: "This archive has expired or reached limits." });
    }

    file.downloadCount += 1;
    await file.save();

    io.emit('file-downloaded', { 
      pinCode: req.params.pin, 
      fileName: file.originalName,
      count: file.downloadCount 
    });

    res.download(file.path, file.originalName);
  } catch (error) {
    res.status(500).json({ error: "Download runtime processing failure." });
  }
});

/**
 * 📊 SECURE AUTHENTICATED ROUTE 5: LIVE HISTORY TRACKER
 */
app.get('/api/history-metrics', authenticateToken, async (req, res) => {
  try {
    // 🔥 SECURE FILTER: Find files matching ONLY the unique ID of the user logged in right now!
    const files = await File.find({ senderId: req.user.id }).sort({ createdAt: -1 });

    const formattedHistory = files.map(file => {
      const isExpired = new Date() > file.expiresAt;
      const isLimitHit = file.downloadCount >= file.downloadLimit;
      
      return {
        pinCode: file.pinCode,
        originalName: file.originalName,
        downloadCount: file.downloadCount,
        downloadLimit: file.downloadLimit,
        expiresAt: file.expiresAt,
        status: (isExpired || isLimitHit) ? 'Expired' : 'Active'
      };
    });

    res.json(formattedHistory);
  } catch (error) {
    res.status(500).json({ error: "Failed to assemble status track record." });
  }
});

// Hourly Automated Cleanup Routine
cron.schedule('0 * * * *', async () => {
  try {
    const expiredFiles = await File.find({ expiresAt: { $lt: new Date() } });
    for (const file of expiredFiles) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      await File.findByIdAndDelete(file._id);
    }
  } catch (err) { console.error("Cron Error:", err); }
});

http.listen(PORT, "0.0.0.0", () => console.log(`🚀 Secure Authenticated System running on port ${PORT}`));