// server/routes/wmsLayerRoutes.js
const express = require('express');
const router = express.Router();
const WMSLayer = require('../models/wmsLayerModel');
const authMiddleware = require('../middleware/authMiddleware');

// Guardar una nueva URL de WMS (solo autenticado)
// ...existing code...
router.post('/guardar', authMiddleware, async (req, res) => {
  try {
    let { name, url, layerName } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No userId in token' });
    if (!name || !url) return res.status(400).json({ success: false, message: 'Faltan campos requeridos (name, url)'});

    // Limpia parámetros de tile
    url = url.replace(/([&?])(BBOX|WIDTH|HEIGHT|SRS|CRS|STYLES|FORMAT|TRANSPARENT|SERVICE|VERSION|REQUEST)=[^&]*/gi, '');

    // Elimina & o ? al final
    url = url.replace(/[&?]+$/, '');

    // Asegura que hay un signo de interrogación antes de los parámetros
    if (!url.includes('?')) {
      url += '?';
    } else if (!url.endsWith('?') && !url.endsWith('&')) {
      url += '&';
    }

    // Añade LAYERS si falta y hay layerName
    if (!/LAYERS=/i.test(url) && layerName) {
      url += `LAYERS=${encodeURIComponent(layerName)}`;
    }

    const newLayer = new WMSLayer({ name, url, userId });
    await newLayer.save();
    res.status(201).json({ success: true, message: 'URL de WMS guardada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al guardar la URL de WMS', error: error.message });
  }
});
// ...existing code...

// Listar URLs de WMS guardadas (accesible para todos los usuarios)
router.get('/listar', async (req, res) => {
  try {
    const layers = await WMSLayer.find({}); // Sin filtro por userId
    res.json({ success: true, layers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener las capas WMS', error: error.message });
  }
});

module.exports = router;
