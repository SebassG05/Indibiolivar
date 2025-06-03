// server/routes/parcelRoutes.js
const express = require('express');
const router = express.Router();
const Parcel = require('../models/parcelModel');
const authMiddleware = require('../middleware/authMiddleware');

// Guardar una nueva parcela (solo autenticado)
router.post('/guardar', authMiddleware, async (req, res) => {
  try {
    const { name, geometry, parcelaInfo, query, arboles, convergencia, vuelo } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No userId in token' });
    const newParcel = new Parcel({
      name,
      geometry,
      parcelaInfo,
      query,
      arboles,
      convergencia,
      vuelo,
      userId
    });
    await newParcel.save();
    res.status(201).json({ success: true, message: 'Parcela guardada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al guardar la parcela', error: error.message });
  }
});

// Listar parcelas guardadas (solo autenticado)
router.get('/listar', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No userId in token' });
    const parcels = await Parcel.find({ userId });
    res.json({ success: true, parcels });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener las parcelas', error: error.message });
  }
});

module.exports = router;
