// server/models/wmsLayerModel.js
const mongoose = require('../db');

const WMSLayerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  name: { type: String, required: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WMSLayer', WMSLayerSchema);
