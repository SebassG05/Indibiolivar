import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import emitter from '@utils/events.utils';
import ParcelDropdown from '../controllers/ParcelDropdown';

const steps = [
  'Selección de Fechas',
  'Selección de Tipo de Índice',
  'Subir Datos',
];

const indexOptions = [
  { label: 'EVI (Enhanced Vegetation Index)', value: 'EVI' },
  { label: 'Precipitation (CHIRPS)', value: 'Precipitation' },
  { label: 'Land Surface Temperature (LST)', value: 'LST' },
  { label: 'Percent Tree Cover (MODIS)', value: 'Percent_Tree_Cover' },
  { label: 'Evapotranspiration (MODIS ET)', value: 'ET' },
  { label: 'Leaf Area Index (Sentinel-2 LAI)', value: 'LAI' },
  { label: 'Solar Irradiance (ERA5-Land)', value: 'Solar_Irradiance' },
  { label: 'NPP-8d Carbon Balance (MODIS)', value: 'NPP8' }
];

const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const PAGE_SIZE = 4; // Número de índices por página

export default function HorizontalLinearStepperData({ onSubmit }) {
  const [activeStep, setActiveStep] = useState(0);
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);

  // NUEVO: Para seleccionar parcela guardada
  const [selectedParcel, setSelectedParcel] = useState(null);
  // Importa ParcelDropdown arriba: import ParcelDropdown from '@components/controllers/ParcelDropdown';

  useEffect(() => {
    const savedStartDate = localStorage.getItem('startDate');
    const savedEndDate = localStorage.getItem('endDate');
    if (savedStartDate) setStartDate(savedStartDate);
    if (savedEndDate) setEndDate(savedEndDate);
  }, []);

  useEffect(() => {
    emitter.emit('setSpatioTemporalSelected', selectedIndexes);
  }, [selectedIndexes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'startDate') {
      setStartDate(value);
      localStorage.setItem('startDate', value);
    } else if (name === 'endDate') {
      setEndDate(value);
      localStorage.setItem('endDate', value);
    }
  };

  const handleIndexChange = (event) => {
    const { value } = event.target;
    setSelectedIndexes((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setSelectedParcel(null); // Si sube ZIP, deselecciona parcela
    } else {
      setSelectedFile(null);
    }
  };

  // NUEVO: Cuando selecciona parcela, deselecciona ZIP
  const handleParcelSelect = (parcel) => {
    setSelectedParcel(parcel);
    setSelectedFile(null);
  };

  const handleNext = async () => {
    if (activeStep === 2) {
      emitter.emit('setSpatioTemporalSelected', selectedIndexes);
      setLoading(true);
      setError(null);
      emitter.emit('spatiotemporalAnalysisLoading');
      const formData = new FormData();
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      selectedIndexes.forEach(idx => formData.append('indices[]', idx));

      // NUEVO: Si hay parcela seleccionada, enviar su geojson
      if (selectedParcel) {
        let geometry = selectedParcel.geometry;
        if (Array.isArray(geometry)) {
          geometry = geometry.find(g => g && (g.type === "Polygon" || g.type === "MultiPolygon"));
        }
        if (!geometry || !geometry.type || !geometry.coordinates) {
          setError('La geometría de la parcela guardada no es válida.');
          setLoading(false);
          return;
        }
        const geojson = {
          type: "Feature",
          geometry: geometry,
          properties: {}
        };
        formData.append('aoiGeoJson', JSON.stringify(geojson));
      } else if (selectedFile) {
        formData.append('aoiDataFiles', selectedFile);
      } else {
        setError('Debes subir un archivo ZIP o seleccionar una parcela guardada.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:5100/get_spatiotemporal', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        setLoading(false);
        if (data.success && Array.isArray(data.output)) {
          emitter.emit('newLayer', {
            id: data.output[2],
            visible: true,
            transparency: 100,
            min: data.output[4],
            max: data.output[5],
            dataset: data.output[6]
          });
          emitter.emit('setBandDates', Array.isArray(data.output[6]) ? data.output[6].map(d => d.Date).filter(Boolean) : []);
          emitter.emit('moveURL', data.output);
          emitter.emit('closeAllController');
          emitter.emit('openLayerController');
        } else if (data && data.output) {
          emitter.emit('moveURL', data.output);
          emitter.emit('closeAllController');
          emitter.emit('openLayerController');
        } else {
          setError(data.error || 'No se recibió una respuesta válida del backend.');
        }
      } catch (err) {
        setLoading(false);
        setError('Error de red o del servidor');
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Calcular el número de páginas
  const totalPages = Math.ceil(indexOptions.length / PAGE_SIZE);
  const paginatedOptions = indexOptions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Box sx={{ width: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 3, boxShadow: 2, p: 0, mt: 2 }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ width: '100%', mb: 2, mt: 1 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {activeStep === 0 && (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: 2, mt: 2 }}>
          <TextField
            label="Fecha Inicio"
            type="date"
            name="startDate"
            value={startDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 3, minWidth: 220, background: '#fafafa', borderRadius: 1 }}
            inputProps={{ style: { textAlign: 'center' } }}
          />
          <TextField
            label="Fecha Fin"
            type="date"
            name="endDate"
            value={endDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 220, background: '#fafafa', borderRadius: 1 }}
            inputProps={{ style: { textAlign: 'center' } }}
          />
        </Box>
      )}
      {activeStep === 1 && (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: 1, mt: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
            Selecciona los índices a analizar
          </Typography>
          <FormGroup>
            {paginatedOptions.map((option) => (
              <FormControlLabel
                key={option.value}
                control={
                  <Checkbox
                    checked={selectedIndexes.includes(option.value)}
                    onChange={handleIndexChange}
                    value={option.value}
                  />
                }
                label={option.label}
              />
            ))}
          </FormGroup>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 2 }}>
              <Button size="small" variant="outlined" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
              <Typography variant="body2">Página {page + 1} de {totalPages}</Typography>
              <Button size="small" variant="outlined" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Siguiente</Button>
            </Box>
          )}
        </Box>
      )}
      {activeStep === 2 && (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: 1, mt: 1 }}>
          {/* NUEVO: Selector de parcela guardada */}
          <ParcelDropdown onSelect={handleParcelSelect} />
          <Typography variant="body2" sx={{ mb: 1, mt: 1, color: '#888' }}>
            O sube un archivo ZIP:
          </Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{ mb: 2 }}
          >
            Seleccionar archivo ZIP
            <input
              type="file"
              accept=".zip"
              hidden
              onChange={handleFileChange}
              disabled={!!selectedParcel}
            />
          </Button>
          {selectedFile && !selectedParcel && (
            <Typography variant="body2" sx={{ color: '#333', mb: 1 }}>
              Archivo seleccionado: {selectedFile.name}
            </Typography>
          )}
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
      )}
      {loading && (
        <Typography color="primary" sx={{ mt: 1 }}>Procesando análisis espaciotemporal...</Typography>
      )}
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 2, mt: 2, mb: 1 }}>
        <Button disabled={activeStep === 0 || loading} sx={{ color: activeStep === 0 ? '#bdbdbd' : '#3f51b5' }} onClick={handleBack}>BACK</Button>
        <Button
          sx={{ color: '#3f51b5', fontWeight: 500 }}
          onClick={handleNext}
          disabled={(activeStep === 2 && !selectedFile && !selectedParcel) || loading}
        >
          {activeStep === 2 ? (loading ? 'Procesando...' : 'FINALIZAR') : 'NEXT'}
        </Button>
      </Box>
    </Box>
  );
}