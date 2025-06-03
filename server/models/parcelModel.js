// server/models/parcelModel.js
const mongoose = require('../db'); // Importa la conexión a la base de datos compartida

const ParcelSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  name: { type: String, required: true },
  geometry: { type: Object, required: true },
  parcelaInfo: { type: Object },
  query: { type: Array },
  arboles: { type: Array },
  convergencia: { type: Object },
  vuelo: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Parcel', ParcelSchema);
