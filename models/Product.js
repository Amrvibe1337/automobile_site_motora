const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  categorySlug: { type: String, required: true, index: true },
  price: { type: Number, required: true, min: 1 },
  engine: { type: String, default: '' },
  power: { type: String, default: '' },
  acceleration: { type: String, default: '' },
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', engine: 'text' });

module.exports = mongoose.model('Product', productSchema, 'products');
