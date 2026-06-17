const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  courseId: { type: String, default: 'all', lowercase: true },
  discountType: { type: String, enum: ['percentage', 'fixed', 'free'], required: true },
  discountValue: { type: Number, default: 0, min: 0, max: 100 },
  maxUses: { type: Number, default: 1, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) }
}, { timestamps: true });

const Voucher = mongoose.model('Voucher', voucherSchema);
module.exports = Voucher;
