const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
  templateImage: {
    type: String,
    default: '/images/certificate-template.png'
  },
  signatureImage: {
    type: String,
    default: ''
  },
  positions: {
    nameX: { type: Number, default: 800 },
    nameY: { type: Number, default: 455 },
    courseX: { type: Number, default: 800 },
    courseY: { type: Number, default: 620 },
    dateX: { type: Number, default: 470 },
    dateY: { type: Number, default: 885 },
    certIdX: { type: Number, default: 1180 },
    certIdY: { type: Number, default: 885 },
    signatureX: { type: Number, default: 800 },
    signatureY: { type: Number, default: 980 },
    signatureScale: { type: Number, default: 1.0 }
  },
  styles: {
    nameFontSize: { type: Number, default: 52 },
    nameFontColor: { type: String, default: '#1a1a1a' },
    courseFontSize: { type: Number, default: 36 },
    courseFontColor: { type: String, default: '#1a1a1a' },
    dateFontSize: { type: Number, default: 28 },
    dateFontColor: { type: String, default: '#1a1a1a' },
    certIdFontSize: { type: Number, default: 28 },
    certIdFontColor: { type: String, default: '#1a1a1a' },
    fontFamily: { type: String, default: 'Georgia' }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);
