const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  type: { type: String, enum: ['exam_only', 'learning'], default: 'exam_only' },
  originalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  voucherCode: { type: String, default: null },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['voucher', 'credit_card', 'paypal', 'ecocash'], default: 'voucher' },
  billingInfo: {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    country: { type: String, default: 'Zimbabwe' }
  },
  completedAt: Date
}, { timestamps: true });

paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
