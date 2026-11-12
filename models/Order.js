const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderNumber: { type: String, unique: true, sparse: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 }
  }],
  customer: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    comment: { type: String, default: '' }
  },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['created', 'processing', 'completed', 'cancelled'], default: 'created' }
}, { timestamps: true });

orderSchema.pre('validate', function assignOrderNumber() {
  if (!this.orderNumber) this.orderNumber = `MTR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
});

module.exports = mongoose.model('Order', orderSchema, 'orders');
