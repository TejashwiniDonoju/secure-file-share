const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  path: { type: String, required: true },          
  password: { type: String, required: true },      
  pinCode: { type: String, required: true, unique: true }, // 6-digit lookup key
  downloadCount: { type: Number, default: 0 },      
  downloadLimit: { type: Number, default: 5 },      
  expiresAt: { type: Date, required: true }         
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);