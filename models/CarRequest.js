const mongoose = require('mongoose');

const carRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  // Снимок автомобиля на момент отправки заявки: данные сохраняются,
  // даже если автомобиль позже переименуют или удалят из каталога.
  productName: { type: String, required: true, trim: true, maxlength: 100 },
  productPrice: { type: Number, required: true, min: 0 },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  phone: { type: String, required: true, trim: true, maxlength: 25 },
  message: { type: String, default: '', trim: true, maxlength: 1500 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  privacyPolicyVersion: { type: String, default: '' },
  privacyPolicyAcknowledgedAt: { type: Date, default: null },
  personalDataConsentVersion: { type: String, default: '' },
  personalDataConsentAt: { type: Date, default: null }
}, { timestamps: true });

carRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CarRequest', carRequestSchema, 'requests');
