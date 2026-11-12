const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  privacyPolicyVersion: { type: String, default: '' },
  privacyPolicyAcknowledgedAt: { type: Date, default: null },
  personalDataConsentVersion: { type: String, default: '' },
  personalDataConsentAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'users');
