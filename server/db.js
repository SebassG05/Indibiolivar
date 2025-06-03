// server/db.js
const mongoose = require('mongoose');

// Conexión a MongoDB sin las opciones deprecated
mongoose.connect('mongodb+srv://mongodbdatabase35:DAN1robdgKt4sNYl@cluster0.mdimaqq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('Conectado a MongoDB'))
  .catch((error) => console.log('Error de conexión:', error));

module.exports = mongoose;
