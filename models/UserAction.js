const mongoose = require('mongoose');

const userActionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, trim: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('UserAction', userActionSchema, 'useractions');
