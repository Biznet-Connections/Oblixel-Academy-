const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true, lowercase: true },
  type: { type: String, enum: ['exam_only', 'learning'], default: 'exam_only' },
  originalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },

  voucherCode: { type: String, default: null },
  voucherDiscountType: { type: String, default: null },
  voucherDiscountValue: { type: Number, default: null },

  linkwaCheckoutUrl: { type: String, default: null },
  linkwaShortUrl: { type: String, default: null },
  linkwaPaymentReference: { type: String, default: null },
  linkwaExternalLinkId: { type: String, default: null },
  webhookPayload: { type: Object, default: null },

  status: {
    type: String,
    enum: ['pending', 'completed', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['voucher', 'linkwa', 'credit_card', 'paypal', 'ecocash'],
    default: 'voucher'
  },
  billingInfo: {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    country: { type: String, default: 'Zimbabwe' }
  },
  failureReason: { type: String, default: null },
  completedAt: Date,
  paidAt: Date
}, { timestamps: true });

paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ linkwaExternalLinkId: 1 });
paymentSchema.index({ linkwaShortUrl: 1, linkwaPaymentReference: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
