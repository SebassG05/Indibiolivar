import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import emitter from '@utils/events.utils';

export default function AnalisisEspaciotemporalPanel() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const handler = (data) => {
      setLoading(false);
      setResults(data);
      // Si el backend devuelve un GeoJSON, cargarlo en el mapa
      if (data && data.geojson) {
        emitter.emit('displayDataset', 'spatiotemporal_aoi', data.geojson);
      }
    };
    const loadingHandler = () => setLoading(true);
    emitter.on('spatiotemporalAnalysisResult', handler);
    emitter.on('spatiotemporalAnalysisLoading', loadingHandler);
    return () => {
      emitter.off('spatiotemporalAnalysisResult', handler);
      emitter.off('spatiotemporalAnalysisLoading', loadingHandler);
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={24} />
        <Typography>Procesando análisis espaciotemporal...</Typography>
      </Box>
    );
  }

  if (!results) return null;

  // Helper para renderizar una tabla de datos
  const renderTable = (data, variableName) => {
    if (!Array.isArray(data) || data.length === 0) return <Typography color="textSecondary">No hay datos para {variableName || 'la variable'}.</Typography>;
    const columns = Object.keys(data[0]);
    return (
      <Box sx={{ mb: 3 }}>
        {variableName && <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{variableName}</Typography>}
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 2, boxShadow: 1 }}>
          <Box component="thead" sx={{ background: '#f0f0f0' }}>
            <Box component="tr">
              {columns.map(col => (
                <Box component="th" key={col} sx={{ p: 1, border: '1px solid #e0e0e0', fontWeight: 700, fontSize: 14 }}>{col}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {data.map((row, i) => (
              <Box component="tr" key={i}>
                {columns.map(col => (
                  <Box component="td" key={col} sx={{ p: 1, border: '1px solid #e0e0e0', fontSize: 13 }}>{row[col]}</Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  };

  // Si results es un objeto con variables, mostrar una tabla por variable
  let content = null;
  if (Array.isArray(results)) {
    content = renderTable(results);
  } else if (results && typeof results === 'object') {
    content = Object.entries(results).map(([variable, data]) => renderTable(data, variable));
  } else {
    content = <Typography color="textSecondary">No hay datos para mostrar.</Typography>;
  }

  return (
    <Box sx={{ p: 2, background: '#f5f5f5', borderRadius: 2, boxShadow: 1, mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Análisis Espaciotemporal</Typography>
      {content}
    </Box>
  );
}
