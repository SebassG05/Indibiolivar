// server/index.js

require('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');  // Ruta de autenticación
const parcelRoutes = require('./routes/parcelRoutes'); // Ruta de parcelas
const wmsLayerRoutes = require('./routes/wmsLayerRoutes'); // Ruta de capas WMS
const maxentRoutes = require('./routes/maxentRoutes'); // Ruta de distribución de especies MaxEnt
const cors = require('cors');

// Middleware para permitir solicitudes desde otros dominios (CORS)
app.use(cors());

// Middleware para parsear el cuerpo de las solicitudes en formato JSON
app.use(express.json());

// Ruta de autenticación
app.use('/api/auth', authRoutes);

// Ruta de parcelas
app.use('/api/parcelas', parcelRoutes);

// Ruta de capas WMS
app.use('/api/wms-layers', wmsLayerRoutes);

// Ruta de distribución de especies MaxEnt
app.use('/api/maxent', maxentRoutes);

// Iniciar el servidor
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
