const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  status: { type: String, enum: ['active', 'unsubscribed'], default: 'active', index: true },
  privacyPolicyVersion: { type: String, default: '' },
  privacyPolicyAcknowledgedAt: { type: Date, default: null },
  personalDataConsentVersion: { type: String, default: '' },
  personalDataConsentAt: { type: Date, default: null },
  newsletterConsentVersion: { type: String, default: '' },
  newsletterConsentAt: { type: Date, default: null }
}, { timestamps: true });


module.exports = mongoose.model('Subscriber', subscriberSchema, 'subscribers');
