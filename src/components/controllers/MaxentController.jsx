import React, { useState, useEffect } from 'react';
import emitter from '@utils/events.utils';
import { Button, Slider, Checkbox, FormControlLabel, Typography, Select, MenuItem, InputLabel, FormControl, Box, Paper, Divider } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Slide from '@material-ui/core/Slide';
import '@styles/menu.style.css';

const defaultVariables = [
  { key: 'bio01', label: 'Temperatura media anual', checked: true },
  { key: 'bio02', label: 'Rango diurno medio', checked: true },
  { key: 'bio03', label: 'Isotermalidad', checked: true },
  { key: 'bio04', label: 'Estacionalidad de la temperatura', checked: true },
  { key: 'bio12', label: 'Precipitación anual', checked: true },
  { key: 'bio15', label: 'Estacionalidad de la precipitación', checked: true },
  { key: 'bio17', label: 'Precipitación del trimestre más seco', checked: true },
  { key: 'bio18', label: 'Precipitación del trimestre más cálido', checked: true },
  { key: 'elevation', label: 'Elevación', checked: true },
  { key: 'slope', label: 'Pendiente', checked: true },
];

const defaultFeatures = [
  { key: 'linear', label: 'Lineales', checked: true },
  { key: 'quadratic', label: 'Cuadráticas', checked: true },
  { key: 'product', label: 'Producto', checked: false },
  { key: 'threshold', label: 'Umbral', checked: true },
  { key: 'hinge', label: 'Bisagra', checked: true },
  { key: 'extrapolate', label: 'Extrapolar', checked: true },
];

const AOI_OPTIONS = [
  { value: 'projects/ee-jbravo/assets/PeninsulaIberica', label: 'Península Ibérica' },
];
const OCCURRENCES_OPTIONS = [
  { value: 'projects/ee-jbravo/assets/hyla_molleri', label: 'Hyla molleri' },
];

const MaxentController = () => {
  const [aoi, setAoi] = useState("ES");
  const [occurrences, setOccurrences] = useState("");
  const [variables, setVariables] = useState(defaultVariables);
  const [features, setFeatures] = useState(defaultFeatures);
  const [betaMultiplier, setBetaMultiplier] = useState(0.5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [importance, setImportance] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openListener = emitter.addListener('openMaxentController', () => setOpen(true));
    const closeListener = emitter.addListener('closeAllController', () => setOpen(false));
    return () => {
      emitter.removeListener(openListener);
      emitter.removeListener(closeListener);
    };
  }, []);

  // Handlers
  const handleVariableChange = idx => {
    setVariables(vars => vars.map((v, i) => i === idx ? { ...v, checked: !v.checked } : v));
  };
  const handleFeatureChange = idx => {
    setFeatures(f => f.map((v, i) => i === idx ? { ...v, checked: !v.checked } : v));
  };

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setImportance(null);
    try {
      const response = await fetch('http://localhost:5001/api/maxent/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species: occurrences,
          aoi,
          variables: variables.filter(v => v.checked).map(v => v.key),
          features: features.filter(f => f.checked).map(f => f.key),
          betaMultiplier
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error ejecutando el modelo');
      setResult('Mapa de distribución generado');
      setImportance(
        data.variable_importance || [
          { variable: 'bio01', importance: 0.32 },
          { variable: 'bio12', importance: 0.21 },
          { variable: 'elevation', importance: 0.18 },
        ]
      );
      // Mostrar puntos de ocurrencia en el mapa si existen
      if (data.occurrences && data.occurrences.length > 0) {
        const geojson = {
          type: 'FeatureCollection',
          features: data.occurrences.map(o => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
            properties: { ...o }
          }))
        };
        emitter.emit('displayTempLayer', { geometry: { type: 'FeatureCollection', features: geojson.features } });
      }
    } catch (err) {
      setResult('Error: ' + err.message);
    }
    setRunning(false);
  };

  const handleExport = () => {
    // Aquí deberías implementar la exportación real
    alert('Exportación simulada a Google Drive');
  };

  return (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <Paper elevation={4} style={{ padding: 24, maxWidth: 500, margin: '32px auto', position: 'fixed', top: 74, right: 10, zIndex: 900 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Icon style={{ marginRight: 8 }}>casino</Icon>
          <Typography variant="h6">Modelo distribución de especies (MaxEnt)</Typography>
          <IconButton style={{ position: 'absolute', top: 6, right: 8 }} aria-label="Close" onClick={() => emitter.emit('closeAllController')}>
            <Icon fontSize="inherit">chevron_right</Icon>
          </IconButton>
        </Box>
        <Divider style={{ marginBottom: 16 }} />
        <FormControl fullWidth margin="normal">
          <InputLabel shrink htmlFor="aoi-input" style={{ fontWeight: 600, color: '#333', marginBottom: 3 }}>
            Área de interés (AOI)
          </InputLabel>
          <Box
            display="flex"
            alignItems="center"
            bgcolor="#f7f9fa"
            borderRadius={3}
            border={1}
            borderColor="#d1d5db"
            px={1.5}
            py={0.5}
            mt={0.5}
            boxShadow={0}
          >
            <Icon style={{ color: '#1976d2', marginRight: 8 }}>place</Icon>
            <input
              id="aoi-input"
              type="text"
              value={aoi}
              disabled
              style={{
                width: '100%',
                padding: '8px 0',
                fontSize: 16,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: '#222',
                fontWeight: 500
              }}
            />
          </Box>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel shrink htmlFor="occurrences-input" style={{ fontWeight: 600, color: '#333', marginBottom: 3 }}>
            Datos de ocurrencia (especie)
          </InputLabel>
          <Box
            display="flex"
            alignItems="center"
            bgcolor="#f7f9fa"
            borderRadius={3}
            border={1}
            borderColor="#d1d5db"
            px={1.5}
            py={0.5}
            mt={0.5}
            boxShadow={0}
          >
            <Icon style={{ color: '#388e3c', marginRight: 8 }}>eco</Icon>
            <input
              id="occurrences-input"
              type="text"
              value={occurrences}
              onChange={e => setOccurrences(e.target.value)}
              placeholder="Ej: Hyla molleri, Quercus ilex, etc."
              style={{
                width: '100%',
                padding: '8px 0',
                fontSize: 16,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: '#222',
                fontWeight: 500
              }}
            />
          </Box>
        </FormControl>
        <Box mt={2} mb={1}>
          <Typography variant="subtitle1">Variables ambientales</Typography>
          <Box display="flex" flexWrap="wrap">
            {variables.map((v, i) => (
              <FormControlLabel
                key={v.key}
                control={<Checkbox checked={v.checked} onChange={() => handleVariableChange(i)} color="primary" />}
                label={v.label}
              />
            ))}
          </Box>
        </Box>
        <Box mt={2} mb={1}>
          <Typography variant="subtitle1">Características del modelo</Typography>
          <Box display="flex" flexWrap="wrap">
            {features.map((f, i) => (
              <FormControlLabel
                key={f.key}
                control={<Checkbox checked={f.checked} onChange={() => handleFeatureChange(i)} color="primary" />}
                label={f.label}
              />
            ))}
          </Box>
        </Box>
        <Box mt={2} mb={1}>
          <Typography gutterBottom>Regularization Multiplier (beta)</Typography>
          <Slider
            value={betaMultiplier}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(_, v) => setBetaMultiplier(v)}
            valueLabelDisplay="auto"
          />
        </Box>
        <Box mt={2} display="flex" justifyContent="space-between">
          <Button
            variant="contained"
            color="primary"
            startIcon={<Icon>play_arrow</Icon>}
            onClick={handleRun}
            disabled={running}
          >
            Ejecutar modelo
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Icon>cloud_download</Icon>}
            onClick={handleExport}
            disabled={!result}
          >
            Exportar
          </Button>
        </Box>
        <Divider style={{ margin: '24px 0' }} />
        {running && <Typography color="textSecondary">Ejecutando modelo...</Typography>}
        {result && (
          <Box>
            <Typography variant="subtitle1">Resultado:</Typography>
            <Box mt={1} mb={2}>
              <Paper variant="outlined" style={{ padding: 12, background: '#f5f5f5' }}>
                {result}
              </Paper>
            </Box>
            <Typography variant="subtitle2">Importancia de variables:</Typography>
            <Box mt={1}>
              <table style={{ width: '100%', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Variable</th>
                    <th style={{ textAlign: 'right' }}>Importancia</th>
                  </tr>
                </thead>
                <tbody>
                  {importance && importance.map(row => (
                    <tr key={row.variable}>
                      <td>{row.variable}</td>
                      <td style={{ textAlign: 'right' }}>{(row.importance * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Paper>
    </Slide>
  );
};

export default MaxentController;
