const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  model: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  privacyPolicyVersion: { type: String, default: '' },
  privacyPolicyAcknowledgedAt: { type: Date, default: null },
  personalDataConsentVersion: { type: String, default: '' },
  personalDataConsentAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema, 'feedback');
