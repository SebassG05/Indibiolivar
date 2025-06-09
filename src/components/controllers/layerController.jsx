import React from 'react';
import Slider from '@material-ui/core/Slider';
import emitter from '@utils/events.utils';
import { Card, CardContent, Checkbox, Icon, IconButton, List, ListItem, ListItemText, Slide, Tooltip, Typography } from '@material-ui/core';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import { Collapse } from '@material-ui/core';
import { Bar, Line } from 'react-chartjs-2';


const GlobalStyles = createTheme({
    typography: {
        fontFamily: 'Lato, Arial, sans-serif',
    },
    overrides: {
        MuiCssBaseline: {
            '@global': {
                body: {
                    fontFamily: 'Lato, Arial, sans-serif',
                },
            },
        },
    },
});

  

const styles = {
    root: {
        position: 'fixed',
        top: 74,
        right: 10,
        width: 450,
        borderRadius: 9,
        margin: 0,
        zIndex: 900,
        boxShadow: '-6px 6px 15px rgba(0, 0, 0, 0.15)',
    },
    header: {
        backgroundColor: 'rgb(102, 201, 107)' // Verde Material UI (green[600])
    },
    closeBtn: {
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 22
    },
    content: {
        paddingBottom: 16
    },
    select: {
        width: '100%'
    },
    layerList: {
        marginTop: 6,
        paddingBottom: 0
    },
    layerItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 2,
        paddingRight: 5, // Ensure some space at the right
    },
    layerText: {
            flexGrow: 1,
            paddingRight: 8 // opcional, si quieres espacio entre texto y el resto
    },
    checkbox: {
        marginRight: '8px', // Add space between the checkbox and text
    },
    slider: {
        width: '80px', // Adjust the width of the slider
        marginLeft: '10px'
    },
    legend: {
        position: 'absolute',
        bottom: '30px',
        left: '10px',
        background: 'rgba(67, 160, 71, 1)', // Igual que el header, verde Material UI
        color: 'white',
        padding: '10px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '18px',
        color: '#333',
        borderRadius: '3px',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)'
    },
    legendTitle: {
        margin: '0 0 10px',
        fontSize: '14px'
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '5px'
    },
    legendColorBox: {
        width: '20px',
        height: '10px',
        display: 'inline-block',
        marginRight: '5px'
    },
    spectralLegend: {
        position: 'absolute',
        bottom: '30px',
        left: '10px',
        background: 'white',
        padding: '10px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '18px',
        width: '20%',
        color: '#333',
        borderRadius: '3px',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)'
    }
};

// Utilidad para crear bins y frecuencias para el histograma
function getHistogramData(dataset, bins = 20) {
    if (!dataset || dataset.length === 0) return { labels: [], counts: [] };
    const min = Math.min(...dataset);
    const max = Math.max(...dataset);
    const step = (max - min) / bins;
    const edges = Array.from({ length: bins + 1 }, (_, i) => min + i * step);
    const counts = Array(bins).fill(0);
    dataset.forEach(val => {
        let idx = Math.floor((val - min) / step);
        if (idx === bins) idx = bins - 1;
        counts[idx]++;
    });
    const labels = edges.slice(0, -1).map((e, i) => `${e.toFixed(2)} - ${edges[i+1].toFixed(2)}`);
    return { labels, counts };
}

// Paleta NDVI estándar (puedes ajustarla si usas otra)
const ndviPalette = [
    '#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b',
    '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'
];

// Función para interpolar la paleta según el número de bins
function getPaletteForBins(palette, bins) {
    if (bins <= palette.length) {
        // Si hay menos bins que colores, recorta la paleta
        const step = palette.length / bins;
        return Array.from({ length: bins }, (_, i) => palette[Math.floor(i * step)]);
    } else {
        // Si hay más bins que colores, interpola linealmente
        const hexToRgb = hex => hex.length === 7 ? [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16)) : [0,0,0];
        const rgbToHex = rgb => '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
        const out = [];
        for (let i = 0; i < bins; i++) {
            const t = i / (bins - 1);
            const idx = t * (palette.length - 1);
            const idx0 = Math.floor(idx);
            const idx1 = Math.ceil(idx);
            const frac = idx - idx0;
            const rgb0 = hexToRgb(palette[idx0]);
            const rgb1 = hexToRgb(palette[idx1]);
            const rgb = rgb0.map((c, j) => Math.round(c + (rgb1[j] - c) * frac));
            out.push(rgbToHex(rgb));
        }
        return out;
    }
}

// Utilidad para generar un array de fechas mensuales entre dos fechas (YYYY-MM-DD)
function getDateRangeLabels(start, end) {
    const result = [];
    if (!start || !end) return result;
    let current = new Date(start);
    current.setDate(1); // Siempre el día 1
    const endDate = new Date(end);
    endDate.setDate(1); // Siempre el día 1
    while (current.getFullYear() < endDate.getFullYear() || (current.getFullYear() === endDate.getFullYear() && current.getMonth() <= endDate.getMonth())) {
        result.push(current.toISOString().slice(0, 7)); // YYYY-MM
        current.setMonth(current.getMonth() + 1);
    }
    return result;
}

// Paletas reales usadas en el backend para cada índice
const indexPalettes = {
    NDVI: [
        '#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b',
        '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'
    ],
    EVI: [
        '#440154', '#31688e', '#35b779', '#fde725', '#ffea00', '#ff9800', '#d84315', '#388e3c', '#1976d2', '#0288d1', '#00bcd4'
    ],
    GNDVI: [
        '#00441b', '#006d2c', '#238b45', '#41ae76', '#66c2a4', '#99d8c9', '#ccece6', '#e5f5f9', '#f7fcfd', '#ffffcc', '#a1dab4'
    ],
    NDMI: [
        '#f7e7c3', '#d9b77c', '#a2c8a3', '#51a4c5', '#0050ef', '#4b0082', '#1976d2', '#0288d1', '#00bcd4', '#388e3c', '#d84315'
    ],
    MSI: [
        '#f7fcf0', '#e0f3db', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081', '#d84315', '#388e3c'
    ],
    BI: [
        '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#ffffff'
    ],
    SAVI: [
        '#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b',
        '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'
    ]
};

// Devuelve la interpretación según el índice y el valor
function getInterpretationLabel(index, value) {
    if (index === 'NDVI') {
        if (value < 0.0) return <b>Agua, nieve o nubes (sin vegetación)</b>;
        if (value < 0.2) return <b>Suelo desnudo o vegetación escasa</b>;
        if (value < 0.4) return <b>Vegetación dispersa</b>;
        if (value < 0.6) return <b>Vegetación moderada en buen estado</b>;
        return <b>Bosques densos o vegetación muy saludable</b>;
    }
    if (index === 'EVI') {
        if (value < 0.1) return <b>Muy poca vegetación o zonas áridas</b>;
        if (value < 0.3) return <b>Vegetación baja</b>;
        if (value < 0.5) return <b>Vegetación en desarrollo</b>;
        if (value < 0.7) return <b>Alta actividad fotosintética</b>;
        return <b>Vegetación muy densa y saludable</b>;
    }
    if (index === 'GNDVI') {
        if (value < 0.1) return <b>Suelo desnudo o vegetación muy débil</b>;
        if (value < 0.3) return <b>Bajo contenido de clorofila</b>;
        if (value < 0.5) return <b>Buena clorofila</b>;
        if (value < 0.7) return <b>Alta fotosíntesis</b>;
        return <b>Vegetación muy saludable</b>;
    }
    if (index === 'NDMI') {
        if (value < 0.0) return <b>Vegetación seca</b>;
        if (value < 0.2) return <b>Baja humedad</b>;
        if (value < 0.4) return <b>Humedad moderada</b>;
        if (value < 0.6) return <b>Buen contenido hídrico</b>;
        return <b>Vegetación muy húmeda</b>;
    }
    if (index === 'MSI') {
        if (value < 0.4) return <b>Bien hidratada</b>;
        if (value < 0.8) return <b>Hidratación adecuada</b>;
        if (value < 1.2) return <b>Inicio de estrés hídrico</b>;
        if (value < 1.6) return <b>Estrés moderado</b>;
        return <b>Alto estrés hídrico</b>;
    }
    if (index === 'BI') {
        if (value < 0.2) return <b>Superficie oscura</b>;
        if (value < 0.4) return <b>Vegetación/suelo húmedo</b>;
        if (value < 0.6) return <b>Mezcla vegetación/suelo</b>;
        if (value < 0.8) return <b>Suelo árido o seco</b>;
        return <b>Superficie muy brillante</b>;
    }
    if (index === 'SAVI') {
        if (value < 0.1) return <b>Suelo desnudo</b>;
        if (value < 0.3) return <b>Vegetación dispersa</b>;
        if (value < 0.5) return <b>Cobertura media</b>;
        if (value < 0.7) return <b>Buena cobertura</b>;
        return <b>Vegetación muy densa</b>;
    }
    return '';
}

// Barra de colores para la leyenda Rusle
function RusleColorBar({ min, max }) {
    // Paleta degradada para Rusle (ajusta los colores si lo necesitas)
    const palette = ['#490EFF', '#12F4FF', '#12FF50', '#E5FF12', '#FF4812'];
    const gradient = `linear-gradient(to right, ${palette.join(', ')})`;
    return (
        <div style={{ width: '100%', margin: '8px 0' }}>
            <div style={{
                width: '100%',
                height: 18,
                borderRadius: 6,
                background: gradient,
                boxShadow: '0 1px 4px #0002'
            }} />
        </div>
    );
}

class LayerController extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            open: false,
            mapp: null,
            selected: {},
            resolution: 7,
            zoom: 0,
            layerForm: 'Border',
            datasets: {},
            layers: [],
            assets: [], // Aquí guardaremos los assets de GEE
            selectedAsset: '', // Aquí guardamos el asset seleccionado por el usuario
            mapUrl: '', // Aquí guardamos la URL del mapa generado
            legendExpanded: false,
            showVegetationLegend: false,
            infoOpen: false,
            showSurfaceAnalysisLegend: false, // Nuevo estado para el subdesplegable
            showSurfaceInfo: false, // Estado para el info del subdesplegable
            selectedIndexType: 'NDVI', // Estado para el índice seleccionado
            activeTool: null, // Nuevo estado para saber qué herramienta está activa
            showChart: true, // Estado para mostrar/ocultar la gráfica
            showHistogram: false, // Nuevo estado para el histograma
            dates: null, // Fechas del dataset temporal
            temporalValues: null, // Valores del dataset temporal
            showBigSurfaceChart: false, // Estado para mostrar el modal con la gráfica ampliada
            bandDates: null, // Fechas seleccionadas por el usuario en BandController
            showSpatiotemporalLegend: false,
            showSpatiotemporalInfo: false,
            selectedSpatioVariables: [], // Solo se actualiza por evento externo
            showBigSpatioChart: null, // Variable para ampliar gráfica espaciotemporal
            spatioTemporalResults: {}, // Store real backend results per variable
            loadingSpatioTemporal: false, // Loading state for backend fetch
            spatioTemporalError: null, // Error state
            lastActiveLayerId: null, // Última capa visible seleccionada
            legendLayerIndex: 0, // Índice de la capa visible actualmente mostrada en la leyenda
            legendViciLayerIndex: 0, // Índice de la capa VICI actualmente mostrada en la leyenda
            legendVariableLayerIndex: 0,
            showRusleLegend: false, 
            showRusleInfo: false, 
            showSOCLegend: false, // Nuevo estado para el subdesplegable SOC
            showSOCInfo: false,   // Estado para el info del subdesplegable SOC
        };
    }

    handleCloseClick = () => {
        this.setState({
            open: false,
            legendExpanded: false,
            showVegetationLegend: false
        });
    }

    truncateLayerName = (name) => {
        if (name.length > 7) {
            return name.substring(0, 4) + '...'; // Keep the first 10 characters and add '...'
        }
        return name; // Return the name as is if it's 13 characters or fewer
    }

    handleDatasetChange = async (e) => {
        var deleting = false;
        Object.keys(this.state.selected).map(item => {
            deleting = true;
            this.setState({
                selected: {}
            });
            return true;
        });

        if (!deleting && e.target.value.length) {
            const id = e.target.value[e.target.value.length - 1];
            emitter.emit('showSnackbar', 'default', `Downloading dataset '${id}'.`);
            emitter.emit('displayDataset', id, this.state.datasets[id].data, '#f08');
            emitter.emit('showSnackbar', 'success', `Dataset '${id}' downloaded successfully.`);
        }
    };

    handleShapeChange = (e) => {
        this.setState({ shape: e.target.value });
    }

    // Toggle visibility of a layer and emit event to canvas.jsx
    handleLayerVisibilityChange = (layerId) => {
        const updatedLayers = this.state.layers.map(layer =>
            layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
        );
        const visibleLayers = updatedLayers.filter(l => l.visible);
        // Si la capa activada/desactivada afecta al número de visibles, ajustar el índice
        let legendLayerIndex = this.state.legendLayerIndex;
        if (legendLayerIndex >= visibleLayers.length) legendLayerIndex = visibleLayers.length - 1;
        if (legendLayerIndex < 0) legendLayerIndex = 0;
        this.setState({ layers: updatedLayers, legendLayerIndex });
        emitter.emit('toggleLayerVisibility', layerId, updatedLayers.find(layer => layer.id === layerId).visible);
    };

    handleTransparencyChange = (layerId, value) => {
        const updatedLayers = this.state.layers.map(layer =>
            layer.id === layerId ? { ...layer, transparency: value } : layer
        );
        this.setState({ layers: updatedLayers });

        // Emitimos un evento para cambiar la transparencia de la capa en Canvas
        emitter.emit('changeLayerTransparency', layerId, value / 100);  // Normalizamos de 0 a 1
    };

    handleLegendPrev = () => {
        this.setState(prev => ({
            legendVariableLayerIndex: prev.legendVariableLayerIndex > 0 ? prev.legendVariableLayerIndex - 1 : prev.legendVariableLayerIndex
        }));
    };

    handleLegendNext = () => {
        const activeVariableLayers = this.state.layers.filter(l => l.visible && l.id && !l.id.toUpperCase().includes('VICI') && !l.id.toUpperCase().includes('SPATIO') && (['NDVI','EVI','GNDVI','NDMI','MSI','BI','SAVI'].some(
            idx => l.id.toUpperCase().includes(idx))));
        this.setState(prev => ({
            legendVariableLayerIndex: prev.legendVariableLayerIndex < activeVariableLayers.length - 1 ? prev.legendVariableLayerIndex + 1 : prev.legendVariableLayerIndex
        }));
    };

    handleLegendPrevVICI = () => {
        const viciLayers = this.state.layers.filter(l => l.visible && l.id && l.id.toUpperCase().includes('VICI'));
        this.setState(prev => ({
            legendViciLayerIndex: prev.legendViciLayerIndex === 0 ? viciLayers.length - 1 : prev.legendViciLayerIndex - 1
        }));
    }

    handleLegendNextVICI = () => {
        const viciLayers = this.state.layers.filter(l => l.visible && l.id && l.id.toUpperCase().includes('VICI'));
        this.setState(prev => ({
            legendViciLayerIndex: prev.legendViciLayerIndex === viciLayers.length - 1 ? 0 : prev.legendViciLayerIndex + 1
        }));
    }

    // Función para cortar el nombre del asset después del "/0" o devolver el nombre si no lo tiene
    splitAssetName = (assetPath) => {
        const parts = assetPath.split('/'); // Dividimos el path por "/"
        let lastPart = parts[parts.length - 1]; // Tomamos la última parte del path
    
        // Si el nombre comienza con "0", lo removemos
        if (lastPart.startsWith('0')) {
            lastPart = lastPart.substring(1); // Eliminar el primer carácter ("0")
        }
        
        return lastPart; // Devolver la última parte procesada
    };


    handleDrop = (event) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = JSON.parse(e.target.result);
                const geoJsonData = data;

                // Add the new layer with default visibility and transparency
                const newLayer = { id: file.name, visible: true, transparency: 100 };

                // Update layers and datasets
                this.setState((prevState) => ({
                    datasets: { ...prevState.datasets, [file.name]: { data: geoJsonData } },
                    layers: [...prevState.layers, newLayer]
                }));

                emitter.emit('displayDataset', file.name, geoJsonData);
                emitter.emit('showSnackbar', 'success', `Dataset '${file.name}' added as a layer successfully.`);
            };
            reader.readAsText(file);
        }
    }; 

    componentDidMount() {

        this.openLayerControllerListener = emitter.addListener('openLayerController', () => {
            this.setState({ open: true });
        });

        // ...existing code in componentDidMount...
        this.newLayerListener = emitter.addListener('newLayer', (newLayerData) => {
            this.setState((prevState) => {
                const exists = prevState.layers.some(layer => layer.id === newLayerData.id);
                if (exists) return null;
                const layerToAdd = {
                    id: newLayerData.id,
                    visible: newLayerData.visible !== undefined ? newLayerData.visible : true,
                    transparency: newLayerData.transparency !== undefined ? newLayerData.transparency : 100,
                    min: newLayerData.min,
                    max: newLayerData.max,
                    dataset: newLayerData.dataset,
                    // Añade estas dos líneas:
                    startDate: newLayerData.startDate,
                    endDate: newLayerData.endDate,
                    // INTEGRAR MÉTRICAS SI EXISTEN
                    metrics: newLayerData.metrics || undefined
                };
                // Si es una capa RUSLE, abre el panel automáticamente
                const isRusle = layerToAdd.id && (
                    layerToAdd.id.toUpperCase().includes('RUSLE') || layerToAdd.id.toUpperCase().includes('EROSION')
                );
                return { 
                    layers: [...prevState.layers, layerToAdd],
                    showRusleLegend: isRusle ? true : prevState.showRusleLegend
                };
            });
        });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({ open: false, legendExpanded: false, showVegetationLegend: false });
        });

        this.setMapZoomListener = emitter.addListener('setMapZoom', (z) => {
            this.setState({ zoom: z });
        });

        this.handleDatasetRemoveListener = emitter.addListener('handleDatasetRemove', () => {
            this.handleDatasetRemove();
        });

        // Escuchar cambios de índice desde el controlador de bandas
        this.indexTypeListener = emitter.addListener('indexTypeChanged', (indexType) => {
            this.setState({ selectedIndexType: indexType });
        });

        // Escuchar qué herramienta está activa
        this.activeToolListener = emitter.addListener('setActiveTool', (tool) => {
            this.setState({ activeTool: tool });
        });

        // Escuchar fechas seleccionadas por el usuario en BandController
        this.bandDatesListener = emitter.addListener('setBandDates', (datesArray) => {
            this.setState({ bandDates: datesArray });
        });

        // Escuchar selección de índices espaciotemporales desde el stepper
        this.spatioTemporalSelectedListener = emitter.addListener('setSpatioTemporalSelected', (selected) => {
            this.setState({ selectedSpatioVariables: selected });
        });

        window.addEventListener('dragover', this.handleDragOver);
        window.addEventListener('drop', this.handleDrop);
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.map !== prevProps.map) {
            this.updateDatasets();
        }
        // Fetch real spatiotemporal data when selectedSpatioVariables changes
        if (
            this.state.activeTool === 'spatiotemporal' &&
            prevState.selectedSpatioVariables !== this.state.selectedSpatioVariables &&
            this.state.selectedSpatioVariables.length > 0
        ) {
            this.fetchSpatioTemporalData();
        }
    }

    fetchSpatioTemporalData = async () => {
        const indices = this.state.selectedSpatioVariables;
        if (!indices || indices.length === 0) return;
        const startDate = localStorage.getItem('startDate');
        const endDate = localStorage.getItem('endDate');
        const zipFile = localStorage.getItem('aoiZipFile'); // Assumes ZIP is stored in localStorage or adapt as needed
        if (!zipFile || !startDate || !endDate) return;
        this.setState({ loadingSpatioTemporal: true, spatioTemporalError: null });
        try {
            const formData = new FormData();
            formData.append('startDate', startDate);
            formData.append('endDate', endDate);
            indices.forEach(idx => formData.append('indices[]', idx));
            // Retrieve the ZIP file from localStorage (as base64 or blob)
            // If stored as base64, convert to Blob
            let zipBlob;
            if (zipFile.startsWith('data:')) {
                // base64 string
                const arr = zipFile.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) u8arr[n] = bstr.charCodeAt(n);
                zipBlob = new Blob([u8arr], { type: mime });
            } else {
                // If already a Blob URL or File, handle accordingly
                zipBlob = zipFile;
            }
            formData.append('aoiDataFiles', zipBlob, 'aoi.zip');
            const response = await fetch('/api/spatiotemporal_analysis_v2', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error('Error fetching spatiotemporal data');
            const result = await response.json();
            if (!result.success || !result.results) throw new Error('No results from backend');
            this.setState({ spatioTemporalResults: result.results, loadingSpatioTemporal: false });
        } catch (err) {
            this.setState({ spatioTemporalError: err.message, loadingSpatioTemporal: false });
        }
    };

    getLegendContent = (layer) => { 
        if (!layer) return null; 
        const layerId = layer.id; 

        if (layerId.includes('VICI')) {
            
            const minValue = Number(layer.min);
            const minText = isNaN(minValue) ? '' : minValue.toFixed(2);
            const maxValue = Number(layer.max);
            const maxText = isNaN(maxValue) ? '' : maxValue.toFixed(2);
            return (
                <div style={{ padding: '10px', textAlign: 'center' }}>
                    <Typography><strong>Vegetation Change</strong> %/year</Typography>
                    <div style={{ 
                        width: '100%', 
                        height: '20px', 
                        background: 'linear-gradient(to right, red, white, green)', 
                        margin: '10px 0', 
                        borderRadius: '5px' 
                    }}>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {/* Display dynamic min value */}
                        <Typography variant="body2">{minText}</Typography>
                        {/* Display dynamic max value */}
                        <Typography variant="body2">{maxText}</Typography>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Decline</Typography>
                        <Typography variant="body2">Increase</Typography>
                    </div>
                </div>
            );
        } else if (layerId.includes('Erosion')) {
            return (
                <div>
                    <Typography><strong>Soil Loss</strong> (t/hac/year)</Typography>
                                    {['#490EFF', '#12F4FF', '#12FF50', '#E5FF12', '#FF4812'].map((color, index) => {
                        const labels = [
                            'Slight (<10)',
                            'Moderate (10-20)',
                            'High (20-30)',
                            'Very high (30-40)',
                            'Severe (>40)'
                        ];
                        return (
                            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ width: '20px', height: '20px', backgroundColor: color, marginRight: '10px' }}></span>
                                <Typography>{labels[index]}</Typography>
                            </div>
                        );
                    })}
                </div>
            );
        } else if (layerId.includes('DSM')) {
            return (
                <div>
                    <Typography><strong>DSM</strong> (t/ha)</Typography>
                    {/* Paleta verdoso-rojiza actualizada */}
                    {['#1a9850', '#a6d96a', '#ffffbf', '#fdae61', '#d73027'].map((color, index) => {
                        const labels = [
                            '0 - 1.2',
                            '1.2 - 2.4',
                            '2.4 - 3.6',
                            '3.6 - 4.8',
                            '4.8 - 6'
                        ];
                        return (
                            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ width: '20px', height: '20px', backgroundColor: color, marginRight: '10px' }}></span>
                                <Typography>{labels[index]}</Typography>
                            </div>
                        );
                    })}
                </div>
            );
        } else if (layerId.includes('avg')) {
            return (
                <div>
                    <Typography><strong>Habitat Suitability</strong></Typography>
                    {['#ffffff', '#cceacc', '#66bf66', '#006600'].map((color, index) => {
                        const labels = [
                            'Unsuitable',
                            'Low suitability',
                            'Moderate suitability',
                            'High suitability'
                        ];
                        return (
                            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ width: '20px', height: '20px', backgroundColor: color, marginRight: '10px' }}></span>
                                <Typography>{labels[index]}</Typography>
                            </div>
                        );
                    })}
                </div>
            );
        } else if (layerId.includes('Suelo')) {
            const usoSueloValues = [ 
                'Tejido urbano continuo', 'Tejido urbano discontinuo', 'Zonas industriales o comerciales',
                'Redes viarias, ferroviarias y terrenos asociados', 'Zonas portuarias', 'Aeropuertos',
                'Zonas de extracción minera', 'Escombreras y vertederos', 'Zonas en construcción',
                'Zonas verdes urbanas', 'Instalaciones deportivas y recreativas', 'Tierras de labor en secano',
                'Terrenos regados permanentemente', 'Arrozales', 'Viñedo', 'Frutales', 'Olivares',
                'Prados y Praderas', 'Cultivos anuales asociados con cultivos permanentes', 'Mosaico de cultivos',
                'Terrenos principalmente agrícolas, pero con importantes espacios de vegetación natural',
                'Sistemas agroforestales', 'Bosques de frondosas', 'Bosques de coníferas', 'Bosque mixto',
                'Pastizales naturales', 'Landas y matorrales', 'Matorrales esclerófilos',
                'Matorral boscoso de transición', 'Playas, dunas y arenales', 'Roquedo',
                'Espacios con vegetación escasa', 'Zonas quemadas', 'Humedales y zonas pantanosas', 'Marismas',
                'Salinas', 'Zonas llanas intermareales', 'Cursos de agua'
            ];

            const colores = [
                '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
                '#8B0000', '#A52A2A', '#5F9EA0', '#7FFF00', '#D2691E', '#6495ED', '#DC143C', '#00FA9A',
                '#FFD700', '#ADFF2F', '#4B0082', '#20B2AA', '#9370DB', '#3CB371', '#7B68EE', '#48D1CC',
                '#C71585', '#191970', '#FF4500', '#DA70D6', '#32CD32', '#4682B4', '#FA8072', '#778899',
                '#8A2BE2', '#00CED1', '#FF1493', '#2E8B57', '#7CFC00', '#B8860B'
            ];

            return (
                <div>
                    <Typography><strong>Uso del Suelo</strong></Typography>
                    <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #ccc',
                        borderRadius: '5px',
                        padding: '10px',
                        marginTop: '10px'
                    }}>
                        {usoSueloValues.map((value, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                <span style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    backgroundColor: colores[index], 
                                    marginRight: '10px' 
                                }}></span>
                                <Typography>{value}</Typography>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    }

    defineSpatiotemporalOnly = () => {
        const { layers } = this.state;
        if (!Array.isArray(layers) || layers.length === 0) return false;
        const visibles = layers.filter(l => l.visible);
        if (visibles.length === 0) return false;
        return visibles.every(l => l.id && l.id.toUpperCase().includes('SPATIO'));
    };

    defineRusleActive = () => {
        const { layers } = this.state;
        if (!Array.isArray(layers) || layers.length === 0) return false;
        return layers.some(l => l.visible && l.id && (
            l.id.toUpperCase().includes('RUSLE') || l.id.toUpperCase().includes('EROSION')
        ));
    };

    handleAssetChange = (event) => {
        const selectedAsset = event.target.value.id;  // Obtenemos el id del asset
        const selectedType = event.target.value.type;  // Obtenemos el tipo del asset
    
        this.setState({
            selectedAsset: selectedAsset,
            selectedAssetType: selectedType
        });
    
        // Obtener la URL del mapa del asset seleccionado
        this.fetchMapUrl(selectedAsset, selectedType);
    };
    

    handleDatasetRemove() {
        this.setState({ datasets: {}, selected: {} });
    }

    handleToggleHistogram = () => {
        this.setState(prev => ({ showHistogram: !prev.showHistogram }));
    };

    handleSpatioVariableToggle = (variable) => {
        this.setState((prevState) => {
            const selected = prevState.selectedSpatioVariables;
            return {
                selectedSpatioVariables: selected.includes(variable)
                    ? selected.filter(v => v !== variable)
                    : [...selected, variable]
            };
        });
    };

    getSpatioTemporalData = (variable) => {
        // Use real backend data if available
        const { spatioTemporalResults } = this.state;
        if (spatioTemporalResults && spatioTemporalResults[variable] && Array.isArray(spatioTemporalResults[variable])) {
            const dataArr = spatioTemporalResults[variable];
            const labels = dataArr.map(d => d.Date || '');
            // Try to find the value key (e.g., EVI, Precipitation, LST, Percent_Tree_Cover)
            let valueKey = Object.keys(dataArr[0] || {}).find(k => k !== 'Date');
            const data = dataArr.map(d => d[valueKey]);
            return { labels, data };
        }
        // Fallback to simulated data if not loaded yet
        const startDate = localStorage.getItem('startDate') || '2022-01-01';
        const endDate = localStorage.getItem('endDate') || '2023-12-01';
        const labels = getDateRangeLabels(startDate, endDate);
        let data;
        if (variable === 'EVI') data = labels.map((_, i) => 0.4 + 0.1 * Math.sin(i / 1.5) + 0.05 * Math.random());
        else if (variable === 'Precipitation') data = labels.map((_, i) => 40 + 30 * Math.abs(Math.sin(i / 2)) + 10 * Math.random());
        else if (variable === 'LST') data = labels.map((_, i) => 20 + 10 * Math.sin(i / 3) + 2 * Math.random());
        else if (variable === 'Percent_Tree_Cover') data = labels.map((_, i) => 60 + 5 * Math.cos(i / 2) + 2 * Math.random());
        else if (variable === 'ET') data = labels.map((_, i) => 2 + 0.5 * Math.sin(i / 1.5) + 0.1 * Math.random());
        else if (variable === 'LAI') data = labels.map((_, i) => 3 + 0.2 * Math.sin(i / 2) + 0.05 * Math.random());
        else if (variable === 'Solar_Irradiance') data = labels.map((_, i) => 200 + 50 * Math.sin(i / 3) + 10 * Math.random());
        else if (variable === 'NPP8') data = labels.map((_, i) => 100 + 20 * Math.sin(i / 2) + 5 * Math.random());
        else data = labels.map(() => 0);
        return { labels, data };
    };

    componentWillUnmount() {
        emitter.removeListener(this.openLayerControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.setMapZoomListener);
        emitter.removeListener(this.handleDatasetRemoveListener);
        emitter.removeListener(this.newLayerListener);  
        emitter.removeListener(this.indexTypeListener);
        emitter.removeListener(this.activeToolListener);
        emitter.removeListener(this.bandDatesListener);
        emitter.removeListener(this.spatioTemporalSelectedListener);
        window.removeEventListener('dragover', this.handleDragOver);
        window.removeEventListener('drop', this.handleDrop);
    }

    getLegendTopOffset = () => {
        const visibleLayers = this.state.layers.filter(layer => layer.visible);
        if (visibleLayers.length >= 3) {
            return '42%'; // Si hay 3 o más capas, bajamos más
        } else if (visibleLayers.length === 2) {
            return '35%'; // Si hay 2 capas
        }
        return '30%'; // Si hay 1 capa
    };    

    toggleLegend = () => {
        this.setState((prevState) => ({
            legendExpanded: !prevState.legendExpanded
        }));
    };

    toggleVegetationLegend = () => {
        this.setState(prevState => ({
          showVegetationLegend: !prevState.showVegetationLegend
        }));
      }
      
    toggleSurfaceAnalysisLegend = () => {
        this.setState(prevState => ({
            showSurfaceAnalysisLegend: !prevState.showSurfaceAnalysisLegend
        }));
    };

    toggleSpatiotemporalLegend = () => {
        this.setState(prevState => ({
            showSpatiotemporalLegend: !prevState.showSpatiotemporalLegend
        }));
    };

    toggleRusleLegend = () => {
        this.setState(prevState => ({
            showRusleLegend: !prevState.showRusleLegend
        }));
    };
    
    handleRusleInfoClick = () => {
        this.setState(prev => ({ showRusleInfo: !prev.showRusleInfo }));
    };

    toggleSOCLegend = () => {
        this.setState(prevState => ({
            showSOCLegend: !prevState.showSOCLegend
        }));
    };
    
    handleSOCInfoClick = () => {
        this.setState(prev => ({ showSOCInfo: !prev.showSOCInfo }));
    };

    render() {
        const visibleLayers = Array.isArray(this.state.layers) ? this.state.layers.filter(layer => layer.visible) : [];
        const legendLayerIndex = Math.min(this.state.legendLayerIndex, visibleLayers.length - 1);
        // --- CAMBIO: para el panel de análisis de la superficie, usar la capa de variable activa según el índice ---
        const activeVariableLayers = this.state.layers.filter(l => l.visible && l.id && !l.id.toUpperCase().includes('VICI') && !l.id.toUpperCase().includes('SPATIO') && (['NDVI','EVI','GNDVI','NDMI','MSI','BI','SAVI'].some(idx => l.id.toUpperCase().includes(idx))));
        const topVariableLayer = activeVariableLayers.length > 0 ? activeVariableLayers[this.state.legendVariableLayerIndex] : null;
        const topVisibleLayer = topVariableLayer || (visibleLayers.length > 0 ? visibleLayers[legendLayerIndex] : null);
        const isSpatiotemporalOnly = this.defineSpatiotemporalOnly();
        const onlySpatiotemporal = Array.isArray(this.state.layers) && this.state.layers.length > 0 && this.state.layers.filter(l => l.visible && l.id && l.id.toUpperCase().includes('SPATIO')).length === this.state.layers.filter(l => l.visible).length;
        // Determinar si el panel de Cambios en la vegetación debe estar bloqueado
        const blockVegetation = !this.state.layers.some(l => l.visible && l.id && l.id.toUpperCase().includes('VICI'));
        // Determinar si el análisis espaciotemporal debe estar bloqueado
        const spatiotemporalActive = this.state.selectedSpatioVariables && this.state.selectedSpatioVariables.length > 0;
        const blockSpatiotemporal = !(this.state.selectedSpatioVariables && this.state.selectedSpatioVariables.length > 0);
        // Determinar si el panel de Análisis de la superficie debe estar bloqueado
        const blockSurfaceAnalysis = activeVariableLayers.length === 0;
        const blockRusle = !this.defineRusleActive();
        const rusleLayer = this.state.layers.find(
        l => l.visible && l.id && (
            l.id.toUpperCase().includes('RUSLE') || l.id.toUpperCase().includes('EROSION')
        )
        );
        const socLayer = this.state.layers.find(
            l => l.visible && l.id && (
                l.id.toUpperCase().includes('SOC') ||
                l.id.toUpperCase().includes('SOIL_ORGANIC') ||
                l.id.toUpperCase().includes('DSM_RESULT')
            )
        );
        const blockSOC = !socLayer;
        // Si no hay ninguna capa visible, forzar a cerrar los paneles y no mostrar leyenda
        if (visibleLayers.length === 0) {
            return (
                <MuiThemeProvider theme={GlobalStyles}>
                    <Slide direction="left" in={this.state.open}>
                        <Card style={styles.root}>
                            <CardContent style={styles.header}>
                                <Typography gutterBottom style={{ fontFamily: 'Lato, Arial, sans-serif', color: 'white', fontWeight: '3' }} variant="h5" component="h2">Capas</Typography>
                                <Typography variant="body2" color="textSecondary">Gestiona y controla las capas</Typography>
                                <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                    <Icon fontSize="inherit">chevron_right</Icon>
                                </IconButton>
                            </CardContent>
                            <CardContent style={styles.content}>
                                <List id="layers" style={styles.layerList}>
                                    {this.state.layers.map(layer => {
                                        // Proteger contra capas sin id
                                        if (!layer || !layer.id) return null;
                                        const indice = ['NDVI','EVI','GNDVI','NDMI','MSI','BI','SAVI'].find(idx => typeof layer.id === 'string' && layer.id.toUpperCase().includes(idx));
                                        return (
                                            <React.Fragment key={layer.id}>
                                                <ListItem style={styles.layerItem}>
                                                    <ListItemText
                                                        primary={
                                                            <span style={{...styles.layerText, width: '100%', display: 'block', textAlign: 'center'}}>
                                                                <span style={{fontWeight: 'bold'}}>Índice: </span>
                                                                <span>{indice || this.splitAssetName(layer.id)}</span>
                                                            </span>
                                                        }
                                                    />
                                                    <Checkbox
                                                        checked={layer.visible}
                                                        onChange={() => this.handleLayerVisibilityChange(layer.id)}
                                                        color="primary"
                                                    />
                                                    <Slider
                                                        value={layer.transparency}
                                                        onChange={(e, value) => this.handleTransparencyChange(layer.id, value)}
                                                        min={0}
                                                        max={100}
                                                        style={styles.slider}
                                                    />
                                                    <Tooltip title="Download this layer" aria-label="Download this layer" enterDelay={200}>
                                                        <IconButton className="icon-container modal-trigger" aria-label="Download this layer" color="inherit">
                                                            <Icon style={styles.fontIcon}>download_icon</Icon>
                                                        </IconButton>
                                                    </Tooltip>
                                                </ListItem>
                                            </React.Fragment>
                                        );
                                    })}
                                </List>
                            </CardContent>
                        </Card>
                    </Slide>
                </MuiThemeProvider>
            );
        }

        const minValue = Number(topVisibleLayer && topVisibleLayer.min);
        const minText = isNaN(minValue) ? '' : minValue.toFixed(2);
        const maxValue = Number(topVisibleLayer && topVisibleLayer.max);
        const maxText = isNaN(maxValue) ? '' : maxValue.toFixed(2);
        const dataset = (topVisibleLayer && topVisibleLayer.dataset) || [];
        const histData = getHistogramData(dataset, 20);

        // Explicaciones y leyendas para cada índice
        const indexExplanations = {
            NDVI: 'NDVI Su valor varía entre -1 y +1. Cuando el valor está cerca de +1, indica vegetación densa y saludable; valores cercanos a 0 representan suelos descubiertos o vegetación muy escasa, y valores negativos indican agua, nieve o nubes.',
            BI: 'Esta funcionalidad permite analizar el brillo general de la superficie usando el índice BI. Valores altos suelen indicar suelos desnudos o zonas urbanas, valores bajos vegetación densa o agua.',
            MSI: 'El MSI no tiene un rango fijo universal, pero sus valores suelen oscilar desde valores cercanos a 0 (poca tensión hídrica) hasta valores mayores de 2 o 3 (alto estrés)',
            SAVI: 'El rango de SAVI también va de -1 a +1, pero se usa principalmente en valores positivos.',
            EVI: 'El EVI también mide la salud de la vegetación, pero mejora la sensibilidad en zonas de alta cobertura vegetal. Sus valores  normalmente se mueven entre -1 y 2. Un valor bajo, como 0.1 o 0.2, indica vegetación escasa o estresada, mientras que valores cercanos a 2 reflejan una vegetación muy activa y saludable.',
            GNDVI: 'Este índice es similar al NDVI, pero en lugar de usar el rojo, utiliza la banda verde, lo que lo hace más sensible al contenido de clorofila. También varía entre -1 y +1. Valores bajos indican una vegetación débil o con poco contenido de clorofila, mientras que valores altos, por encima de 0.6, señalan plantas en buen estado y alto nivel de fotosíntesis. Es útil para detectar estrés antes de que se haga visible.',
            NDMI:'El NDMI mide la humedad en la vegetación. Su rango también va de -1 a +1. Un valor bajo o negativo indica que la vegetación está seca o bajo estrés hídrico. Por el contrario, si el valor es alto, por ejemplo 0.5 o más, muestra que la vegetación contiene buena cantidad de agua y está en buen estado.'
        };
        // Paletas reales usadas en el backend para cada índice
        const indexLegends = {
            NDVI: (
                <div style={{ marginTop: 12 }}>
                    <Typography variant="subtitle2"><b>NDVI</b></Typography>
                    <div style={{
                        width: '100%',
                        height: 20,
                        background: 'linear-gradient(to right, #a50026, #d73027, #f46d43, #fdae61, #fee08b, #ffffbf, #d9ef8b, #a6d96a, #66bd63, #1a9850, #006837)',
                        borderRadius: 5,
                        margin: '10px 0'
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span>{getInterpretationLabel('NDVI', minValue)}</span>
                        <span>{getInterpretationLabel('NDVI', maxValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Inicio: {localStorage.getItem('startDate') || 'N/A'}</span>
                        <span>Fin: {localStorage.getItem('endDate') || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Mín: {minText}</span>
                        <span>Máx: {maxText}</span>
                    </div>
                </div>
            ),
            EVI: (
                <div style={{ marginTop: 12 }}>
                    <Typography variant="subtitle2"><b>EVI</b></Typography>
                    <div style={{
                        width: '100%',
                        height: 20,
                        background: 'linear-gradient(to right, #a50026, #d73027, #f46d43, #fdae61, #fee08b, #ffffbf, #d9ef8b, #a6d96a, #66bd63, #1a9850, #006837)',
                        borderRadius: 5,
                        margin: '10px 0'
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span>{getInterpretationLabel('EVI', minValue)}</span>
                        <span>{getInterpretationLabel('EVI', maxValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Inicio: {localStorage.getItem('startDate') || 'N/A'}</span>
                        <span>Fin: {localStorage.getItem('endDate') || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Mín: {minText}</span>
                        <span>Máx: {maxText}</span>
                    </div>
                </div>
            ),
            GNDVI: (
                <div style={{ marginTop: 12 }}>
                    <Typography variant="subtitle2"><b>GNDVI</b></Typography>
                    <div style={{
                        width: '100%',
                        height: 20,
                        background: 'linear-gradient(to right, #a50026, #d73027, #f46d43, #fdae61, #fee08b, #ffffbf, #d9ef8b, #a6d96a, #66bd63, #1a9850, #006837)',
                        borderRadius: 5,
                        margin: '10px 0'
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span>{getInterpretationLabel('GNDVI', minValue)}</span>
                        <span>{getInterpretationLabel('GNDVI', maxValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Inicio: {localStorage.getItem('startDate') || 'N/A'}</span>
                        <span>Fin: {localStorage.getItem('endDate') || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Mín: {minText}</span>
                        <span>Máx: {maxText}</span>
                    </div>
                </div>
            ),
            NDMI: (
                <div style={{ marginTop: 12 }}>
                    <Typography variant="subtitle2"><b>NDMI</b></Typography>
                    <div style={{
                        width: '100%',
                        height: 20,
                        background: 'linear-gradient(to right, #f7e7c3, #d9b77c, #a2c8a3, #51a4c5, #0050ef, #4b0082)',
                        borderRadius: 5,
                        margin: '10px 0'
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span>{getInterpretationLabel('NDMI', minValue)}</span>
                        <span>{getInterpretationLabel('NDMI', maxValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Inicio: {localStorage.getItem('startDate') || 'N/A'}</span>
                        <span>Fin: {localStorage.getItem('endDate') || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Mín: {minText}</span>
                        <span>Máx: {maxText}</span>
                    </div>
                </div>
            ),
            MSI: (
                <div style={{ marginTop: 12 }}>
                    <Typography variant="subtitle2"><b>MSI</b></Typography>a2c8a3
                    <div style={{
                        width: '100%',
                        height: 20,
                        background: 'linear-gradient(to right, #4b0082, #0050ef, #51a4c5, #a2c8a3, #d9b77c, #f7e7c3)',
                        borderRadius: 5,
                        margin: '10px 0'
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span>{getInterpretationLabel('MSI', minValue)}</span>
                        <span>{getInterpretationLabel('MSI', maxValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Inicio: {localStorage.getItem('startDate') || 'N/A'}</span>
                        <span>Fin: {localStorage.getItem('endDate') || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Mín: {minText}</span>
                        <span>Máx: {maxText}</span>
                    </div>
                </div>
            ),
            BI: (
                <div style={{ marginTop: 12 }}>
                    <Typography variant="subtitle2"><b>BI</b></Typography>
                    <div style={{
                        width: '100%',
                        height: 20,
                        background: 'linear-gradient(to right, #000000, #1a1a1a, #333333, #4d4d4d, #666666, #808080, #999999, #b3b3b3, #cccccc, #e6e6e6, #ffffff)',
                        borderRadius: 5,
                        margin: '10px 0'
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span>{getInterpretationLabel('BI', minValue)}</span>
                        <span>{getInterpretationLabel('BI', maxValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Inicio: {localStorage.getItem('startDate') || 'N/A'}</span>
                        <span>Fin: {localStorage.getItem('endDate') || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Mín: {minText}</span>
                        <span>Máx: {maxText}</span>
                    </div>
                </div>
            ),
            SAVI: (
                <div style={{ marginTop: 12 }}>
                    <Typography variant="subtitle2"><b>SAVI</b></Typography>
                    <div style={{
                        width: '100%',
                        height: 20,
                        background: 'linear-gradient(to right, #a50026, #d73027, #f46d43, #fdae61, #fee08b, #ffffbf, #d9ef8b, #a6d96a, #66bd63, #1a9850, #006837)',
                        borderRadius: 5,
                        margin: '10px 0'
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span>{getInterpretationLabel('SAVI', minValue)}</span>
                        <span>{getInterpretationLabel('SAVI', maxValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Inicio: {localStorage.getItem('startDate') || 'N/A'}</span>
                        <span>Fin: {localStorage.getItem('endDate') || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                        <span>Mín: {minText}</span>
                        <span>Máx: {maxText}</span>
                    </div>
                </div>
            )
        };

        const { activeTool } = this.state;
        const isSpatiotemporal = this.state.activeTool === 'spatiotemporal';

        // En el render, para la gráfica temporal:
        const fechasDataset = Array.isArray(dataset) && dataset.length > 0 && typeof dataset[0] === 'object' && dataset[0].Date
            ? dataset.map(d => d.Date || '')
            : null;
        const valoresDataset = Array.isArray(dataset) && dataset.length > 0 && typeof dataset[0] === 'object' && dataset[0].Value !== undefined
            ? dataset.map(d => d.Value)
            : dataset;
        const startDate = localStorage.getItem('startDate');
        const endDate = localStorage.getItem('endDate');
        const labels = getDateRangeLabels(startDate, endDate);

        // Calcular min y max dinámicamente para el eje Y de la gráfica de línea
        let minY = 0, maxY = 1;
        if (valoresDataset && valoresDataset.length > 0) {
            minY = Math.min(...valoresDataset);
            maxY = Math.max(...valoresDataset);
            // Si min y max son iguales, ajusta para que la gráfica no sea plana
            if (minY === maxY) {
                minY = minY - 0.1;
                maxY = maxY + 0.1;
            }
        }

        const spatioVariables = [
            { key: 'EVI', label: 'EVI (Enhanced Vegetation Index)' },
            { key: 'Precipitation', label: 'Precipitation (CHIRPS)' },
            { key: 'LST', label: 'Land Surface Temperature (LST)' },
            { key: 'Percent_Tree_Cover', label: 'Percent Tree Cover (MODIS)' },

        ];

        const showSurfaceAnalysis = this.state.activeTool === 'surfaceAnalysis' || this.state.activeTool === 'both';

        return (
            <MuiThemeProvider theme={GlobalStyles}>
                <Slide direction="left" in={this.state.open}>
                    <Card style={styles.root}>
                        <CardContent style={styles.header}>
                            <Typography gutterBottom style={{ fontFamily: 'Lato, Arial, sans-serif', color: 'white', fontWeight: '3' }} variant="h5" component="h2">Capas</Typography>
                            <Typography variant="body2" color="textSecondary">Gestiona y controla las capas</Typography>
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>
    
                        <CardContent style={styles.content}>
                            <List id="layers" style={styles.layerList}>
                                {this.state.layers.map(layer => {
                                    // Proteger contra capas sin id
                                    if (!layer || !layer.id) return null;
                                    const indice = ['NDVI','EVI','GNDVI','NDMI','MSI','BI','SAVI'].find(idx => typeof layer.id === 'string' && layer.id.toUpperCase().includes(idx));
                                    return (
                                        <React.Fragment key={layer.id}>
                                            <ListItem style={styles.layerItem}>
                                                <ListItemText
                                                    primary={
                                                        <span style={{...styles.layerText, width: '100%', display: 'block', textAlign: 'center'}}>
                                                            <span style={{fontWeight: 'bold'}}>Índice: </span>
                                                            <span>{indice || this.splitAssetName(layer.id)}</span>
                                                        </span>
                                                    }
                                                />
                                                <Checkbox
                                                    checked={layer.visible}
                                                    onChange={() => this.handleLayerVisibilityChange(layer.id)}
                                                    color="primary"
                                                />
                                                <Slider
                                                    value={layer.transparency}
                                                    onChange={(e, value) => this.handleTransparencyChange(layer.id, value)}
                                                    min={0}
                                                    max={100}
                                                    style={styles.slider}
                                                />
                                                <Tooltip title="Download this layer" aria-label="Download this layer" enterDelay={200}>
                                                    <IconButton className="icon-container modal-trigger" aria-label="Download this layer" color="inherit">
                                                        <Icon style={styles.fontIcon}>download_icon</Icon>
                                                    </IconButton>
                                                </Tooltip>
                                            </ListItem>
                                        </React.Fragment>
                                    );
                                })}
                            </List>
                        </CardContent>
                    </Card>
                </Slide>

                {/* Show the legend panel only if open is true and there is a visible layer */}
                {this.state.open && topVisibleLayer && (
                    <fieldset
                        style={{
                            position: 'fixed',
                            top: this.getLegendTopOffset(),
                            right: '4px',
                            width: '450px',
                            background: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 0 15px rgba(0,0,0,0.2)',
                            zIndex: 500,
                            fontFamily: 'Arial, sans-serif',
                            margin: '5px',
                            fontSize: '12px',
                            maxHeight: 'calc(100vh - 100px)',
                            padding: 0,
                            border: '1px solid #ddd',
                        }}
                    >
                        <legend
                            style={{
                                width: '100%',
                                height: '60px',
                                overflowY: 'auto',
                                background: '#f5f5f5',
                                borderRadius: '8px 8px 0 0',
                                padding: '10px 15px',
                                marginBottom: 0,
                                fontWeight: 700,
                                fontSize: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: this.state.legendExpanded ? '1px solid #ddd' : 'none',
                            }}
                        >
                            <span style={{display: 'flex', alignItems: 'center'}}>
                                <Typography variant="body2"><strong><b>Leyenda</b></strong></Typography>
                            </span>
                            <Icon onClick={this.toggleLegend}>{this.state.legendExpanded ? 'expand_less' : 'expand_more'}</Icon>
                        </legend>
                        <div
                            className="custom-scrollbar"
                            style={{
                                maxHeight: 'calc(100vh - 180px)',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                padding: '0 15px 15px 15px',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#81c784 #e0e0e0',
                            }}
                        >
                            {/* Estilos para scroll bonito en Chrome/Safari/Edge */}
                            <style>{`
                                .custom-scrollbar::-webkit-scrollbar {
                                    width: 10px;
                                    background: #e0e0e0;
                                    border-radius: 8px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb {
                                    background: #81c784;
                                    border-radius: 8px;
                                }
                            `}</style>
                            <Collapse in={this.state.legendExpanded} timeout="auto" unmountOnExit>
                                <div style={{ padding: 0 }}>
                                    {/* Cambios en la vegetación */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: blockVegetation ? 'not-allowed' : 'pointer',
                                            padding: '10px 0',
                                            borderBottom: '1px solid #eee',
                                            opacity: blockVegetation ? 0.4 : 1,
                                            background: blockVegetation ? '#f0f0f0' : undefined,
                                            color: blockVegetation ? '#aaa' : undefined
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', color: blockVegetation ? '#aaa' : undefined }}>
                                            <Typography variant="body2"><strong><b>Cambios en la vegetación</b></strong></Typography>
                                            <IconButton size="small" onClick={e => { if (!blockVegetation) { e.stopPropagation(); this.setState({ infoOpen: !this.state.infoOpen }); } }} style={{ marginLeft: 6, color: blockVegetation ? '#aaa' : '#1976d2' }} disabled={blockVegetation}>
                                                <Icon style={{ fontSize: 18 }}>info</Icon>
                                            </IconButton>
                                        </div>
                                        <Icon style={{ color: blockVegetation ? '#aaa' : undefined, cursor: blockVegetation ? 'not-allowed' : 'pointer' }} onClick={e => { if (!blockVegetation) { e.stopPropagation(); this.toggleVegetationLegend(); } }}>
                                            {this.state.showVegetationLegend ? 'expand_less' : 'expand_more'}
                                        </Icon>
                                    </div>

                                    {/* Modelo Rusle */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: blockRusle ? 'not-allowed' : 'pointer',
                                            padding: '10px 0',
                                            borderBottom: '1px solid #eee',
                                            opacity: blockRusle ? 0.4 : 1,
                                            background: blockRusle ? '#f0f0f0' : undefined,
                                            color: blockRusle ? '#aaa' : undefined
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography variant="body2"><strong><b>Modelo Rusle</b></strong></Typography>
                                            <IconButton size="small" onClick={e => { if (!blockRusle) { e.stopPropagation(); this.handleRusleInfoClick(); } }} style={{ marginLeft: 6, color: blockRusle ? '#aaa' : '#1976d2' }} disabled={blockRusle}>
                                                <Icon style={{ fontSize: 18 }}>info</Icon>
                                            </IconButton>
                                        </div>
                                        <Icon style={{ cursor: blockRusle ? 'not-allowed' : 'pointer', color: blockRusle ? '#aaa' : undefined }} onClick={e => { if (!blockRusle) { e.stopPropagation(); this.toggleRusleLegend(); } }}>
                                            {this.state.showRusleLegend ? 'expand_less' : 'expand_more'}
                                        </Icon>
                                    </div>
                                    <Collapse in={this.state.showRusleInfo && !blockRusle} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '12px 16px', background: '#f9f9f9', borderRadius: 8, margin: '8px 0' }}>
                                            <Typography variant="subtitle2" gutterBottom><b>¿Para qué sirve el modelo RUSLE?</b></Typography>
                                            <Typography variant="body2" style={{ textAlign: 'justify' }}>
                                                El modelo RUSLE permite estimar la erosión del suelo en función de factores como la lluvia, el tipo de suelo, la topografía, el uso del suelo y las prácticas de manejo. Este panel muestra los resultados del modelo para el área seleccionada.
                                            </Typography>
                                        </div>
                                    </Collapse>
                                    <Collapse in={this.state.showRusleLegend && !blockRusle} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '10px 0', textAlign: 'center', maxHeight: '250px', overflowY: 'auto' }}>
                                            <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#490EFF', marginBottom: 8 }}>Paleta Modelo Rusle</Typography>
                                            {/* Barra de colores para Rusle */}
                                            <RusleColorBar
                                                min={(rusleLayer && rusleLayer.min != null) ? rusleLayer.min : 0}
                                                max={(rusleLayer && rusleLayer.max != null) ? rusleLayer.max : 1}
                                            />

                                            {rusleLayer && rusleLayer.startDate && rusleLayer.endDate && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                                                    <span>Inicio: {rusleLayer.startDate}</span>
                                                    <span>Fin: {rusleLayer.endDate}</span>
                                                </div>
                                            )}
                                            {/* Si quieres, puedes dejar la leyenda antigua debajo */}
                                            {/* {rusleLayer ? this.getLegendContent(rusleLayer) : null} */}
                                        </div>
                                    </Collapse>
                                    {/* SOC (Carbono Orgánico del Suelo) */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: blockSOC ? 'not-allowed' : 'pointer',
                                            padding: '10px 0',
                                            borderBottom: '1px solid #eee',
                                            opacity: blockSOC ? 0.4 : 1,
                                            background: blockSOC ? '#f0f0f0' : undefined,
                                            color: blockSOC ? '#aaa' : undefined
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', color: blockSOC ? '#aaa' : undefined }}>
                                            <Typography variant="body2"><strong><b>SOC (Carbono Orgánico del Suelo)</b></strong></Typography>
                                            <IconButton size="small" onClick={e => { e.stopPropagation(); this.handleSOCInfoClick(); }} style={{ marginLeft: 6, color: blockSOC ? '#aaa' : '#1976d2' }} disabled={blockSOC}>
                                                <Icon style={{ fontSize: 18 }}>info</Icon>
                                            </IconButton>
                                        </div>
                                        <Icon style={{ cursor: blockSOC ? 'not-allowed' : 'pointer', color: blockSOC ? '#aaa' : undefined }} onClick={e => { if (!blockSOC) { e.stopPropagation(); this.toggleSOCLegend(); } }}>
                                            {this.state.showSOCLegend ? 'expand_less' : 'expand_more'}
                                        </Icon>
                                    </div>
                                    <Collapse in={this.state.showSOCInfo && !blockSOC} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '12px 16px', background: '#f9f9f9', borderRadius: 8, margin: '8px 0' }}>
                                            <Typography variant="subtitle2" gutterBottom><b>¿Para qué sirve el análisis SOC?</b></Typography>
                                            <Typography variant="body2" style={{ textAlign: 'justify' }}>
                                                Esta funcionalidad permite estimar el carbono orgánico del suelo (SOC) en el área seleccionada, usando modelos predictivos y datos satelitales. El SOC es un indicador clave de la salud y fertilidad del suelo.
                                            </Typography>
                                        </div>
                                    </Collapse>
                                    <Collapse in={this.state.showSOCLegend && !blockSOC} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '10px 0', textAlign: 'center', maxHeight: '250px', overflowY: 'auto' }}>
                                            {socLayer && (
                                                <>
                                                    <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#795548', marginBottom: 8 }}>Paleta SOC (t/ha)</Typography>
                                                    <div style={{
                                                        width: '100%',
                                                        height: 20,
                                                        background: 'linear-gradient(to right, #1a9850, #a6d96a, #ffffbf, #fdae61, #d73027)',
                                                        borderRadius: 5,
                                                        margin: '10px 0'
                                                    }}></div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                                                        <span>Mín: {typeof socLayer.min === 'number' ? socLayer.min.toFixed(2) : socLayer.min || '0'}</span>
                                                        <span>Máx: {typeof socLayer.max === 'number' ? socLayer.max.toFixed(2) : socLayer.max || '6'}</span>
                                                    </div>
                                                    {socLayer.startDate && socLayer.endDate && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                                                            <span>Inicio: {socLayer.startDate}</span>
                                                            <span>Fin: {socLayer.endDate}</span>
                                                        </div>
                                                    )}
                                                    {/* Mostrar métricas de desempeño si existen */}
                                                    {socLayer && socLayer.metrics && Object.keys(socLayer.metrics).length > 0 && (
                                                        <div style={{ marginTop: 8, textAlign: 'left' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: 4, fontSize: 13 }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th colSpan={2} style={{ textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 14, padding: 6 }}>
                                                                            Indicadores de desempeño
                                                                        </th>
                                                                    </tr>
                                                                    <tr style={{ background: '#f5f5f5' }}>
                                                                        <th style={{ border: '1px solid #ddd', padding: 4, fontWeight: 600 }}>Índice</th>
                                                                        <th style={{ border: '1px solid #ddd', padding: 4, fontWeight: 600 }}>Valor</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {Object.entries(socLayer.metrics).map(([key, value]) => (
                                                                        <tr key={key}>
                                                                            <td style={{ border: '1px solid #ddd', padding: 4 }}>{key}</td>
                                                                            <td style={{ border: '1px solid #ddd', padding: 4 }}>{typeof value === 'number' ? value.toFixed(3) : value}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {!socLayer && (
                                                <Typography variant="body2" color="textSecondary" style={{ marginTop: 12 }}>No hay resultados de SOC para mostrar.</Typography>
                                            )}
                                        </div>
                                    </Collapse>

                                    {/* Info collapsible */}
                                    <Collapse in={this.state.infoOpen && !blockVegetation} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '12px 16px', background: '#f9f9f9', borderRadius: 8, margin: '8px 0' }}>
                                            <Typography variant="subtitle2" gutterBottom><b>¿Para qué sirve esta funcionalidad?</b></Typography>
                                            <Typography variant="body2" style={{ textAlign: 'justify' }}>
                                                Esta funcionalidad te muestra cómo ha cambiado la vegetación o el suelo en un lugar entre dos fechas. Usa imágenes de satélite Landsat para comparar si hay más o menos suelo desnudo, pasto o árboles, y si están más verdes o secos. <br /><br />
                                                Además, también puede mostrar si el suelo está más seco o tiene más agua, gracias a otros indicadores especiales. Todo esto se ve en un mapa con colores, para que entiendas rápido qué zonas han cambiado. Las zonas en rojo o negativas son zonas donde el índice calculado ha disminuido, es decir, la cobertura vegetal está en un peor estado que la fecha inicial del análisis. Las zonas verdes o positivas indican que la cobertura ha mejorado respecto al inicio del análisis.
                                            </Typography>
                                        </div>
                                    </Collapse>
                                    <Collapse in={this.state.showVegetationLegend && !blockVegetation} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '10px 0', textAlign: 'center', position: 'relative' }}>
                                            {blockVegetation && (
                                                <div style={{
                                                    width: '100%',
                                                    height: 60,
                                                    background: '#f0f0f0',
                                                    color: '#aaa',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 600,
                                                    fontSize: 16,
                                                    borderRadius: 8,
                                                    marginBottom: 8
                                                }}>
                                                    Panel deshabilitado: activa una capa de cambios en la vegetación para ver la leyenda
                                                </div>
                                            )}
                                            {/* ...leyenda o contenido habitual... */}
                                            {(() => {
                                                const viciLayers = this.state.layers.filter(l => l.visible && l.id && l.id.toUpperCase().includes('VICI'));
                                                if (viciLayers.length === 0) return null;
                                                const idx = this.state.legendViciLayerIndex || 0;
                                                const viciLayer = viciLayers[idx] || viciLayers[0];
                                                return (
                                                    <>
                                                        <Typography>Tasa de cambio del índice</Typography>
                                                        <div style={{
                                                            width: '100%',
                                                            height: '20px',
                                                            background: 'linear-gradient(to right, red, white, green)',
                                                            margin: '10px 0',
                                                            borderRadius: '5px'
                                                        }}></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="body2">{minText}</Typography>
                                                            <Typography variant="body2">{maxText}</Typography>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="body2">Disminución</Typography>
                                                            <Typography variant="body2">Aumento</Typography>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <Typography variant="body2">
                                                                {viciLayer && viciLayer.startDate ? `Inicio: ${viciLayer.startDate}` : (localStorage.getItem('startDate') ? `Inicio: ${localStorage.getItem('startDate')}` : 'Inicio: N/A')}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                {viciLayer && viciLayer.endDate ? `Fin: ${viciLayer.endDate}` : (localStorage.getItem('endDate') ? `Fin: ${localStorage.getItem('endDate')}` : 'Fin: N/A')}
                                                            </Typography>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </Collapse>

                                    {/* Nuevo subdesplegable: Análisis de la superficie */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: blockSurfaceAnalysis ? 'not-allowed' : 'pointer',
                                            padding: '10px 0',
                                            borderBottom: '1px solid #eee',
                                            opacity: blockSurfaceAnalysis ? 0.4 : 1,
                                            background: blockSurfaceAnalysis ? '#f0f0f0' : undefined,
                                            color: blockSurfaceAnalysis ? '#aaa' : undefined
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', color: blockSurfaceAnalysis ? '#aaa' : undefined }}>
                                            <Typography variant="body2"><strong><b>Análisis de la superficie</b></strong></Typography>
                                            <IconButton size="small" onClick={e => { e.stopPropagation(); this.handleSurfaceInfoClick(); }} style={{ marginLeft: 6, color: blockSurfaceAnalysis ? '#aaa' : '#1976d2' }} disabled={blockSurfaceAnalysis}>
                                                <Icon style={{ fontSize: 18 }}>info</Icon>
                                            </IconButton>
                                        </div>
                                        <Icon style={{ cursor: blockSurfaceAnalysis ? 'not-allowed' : 'pointer', color: blockSurfaceAnalysis ? '#aaa' : undefined }} onClick={e => { if (!blockSurfaceAnalysis) { e.stopPropagation(); this.toggleSurfaceAnalysisLegend(); } }}>
                                            {this.state.showSurfaceAnalysisLegend ? 'expand_less' : 'expand_more'}
                                        </Icon>
                                    </div>
                                    <Collapse in={this.state.showSurfaceInfo && !blockSurfaceAnalysis} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '12px 16px', background: '#f9f9f9', borderRadius: 8, margin: '8px 0' }}>
                                            <Typography variant="subtitle2" gutterBottom><b>¿Para qué sirve esta funcionalidad con el índice seleccionado?</b></Typography>
                                            <Typography variant="body2" style={{ textAlign: 'justify' }}>
                                                {indexExplanations[this.state.selectedIndexType] || 'Selecciona un índice para ver la explicación.'}
                                            </Typography>
                                        </div>
                                    </Collapse>
                                    <Collapse in={this.state.showSurfaceAnalysisLegend && !blockSurfaceAnalysis} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '10px 0', textAlign: 'center', maxHeight: '250px', overflowY: 'auto' }}>
                                            {(activeVariableLayers.length > 0 && topVisibleLayer) && (
                                                <div style={{ width: '100%' }}>
                                                    {activeVariableLayers.length === 2 && (
                                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                                                            <button onClick={this.handleLegendPrev} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer' }}>{'<'}</button>
                                                            <span style={{ margin: '0 8px', fontWeight: 'bold' }}>
                                                                {topVisibleLayer ? (
                                                                    (() => {
                                                                        const start = topVisibleLayer.startDate || (topVisibleLayer.dataset && topVisibleLayer.dataset.length > 0 && topVisibleLayer.dataset[0].Date);
                                                                        const end = topVisibleLayer.endDate || (topVisibleLayer.dataset && topVisibleLayer.dataset.length > 0 && topVisibleLayer.dataset[topVisibleLayer.dataset.length - 1].Date);
                                                                        if (start && end) {
                                                                            return `${start} - ${end}`;
                                                                        }
                                                                        return '';
                                                                    })()
                                                                ) : ''}
                                                            </span>
                                                            <button onClick={this.handleLegendNext} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer' }}>{'>'}</button>
                                                        </div>
                                                    )}
                                                    <div>
                                                        {indexLegends[
                                                            (['NDVI','EVI','GNDVI','NDMI','MSI','BI','SAVI'].find(idx => topVisibleLayer.id && topVisibleLayer.id.toUpperCase().includes(idx))) || 'NDVI'
                                                        ]}
                                                    </div>
                                                </div>
                                            )}
                                            {dataset && dataset.length > 0 && (
                                                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <button
                                                        style={{
                                                            background: this.state.showHistogram
                                                                ? 'linear-gradient(90deg, #43a047 0%, #a8e063 100%)'
                                                                : 'linear-gradient(90deg, #388e3c 0%, #a8e063 100%)',
                                                            border: 'none',
                                                            borderRadius: 24,
                                                            padding: '8px 28px',
                                                            cursor: 'pointer',
                                                            fontWeight: 700,
                                                            fontSize: 16,
                                                            color: '#fff',
                                                            boxShadow: '0 2px 8px rgba(67,160,71,0.12)',
                                                            outline: 'none',
                                                            marginBottom: 8,
                                                            letterSpacing: 0.5,
                                                            transition: 'background 0.2s, box-shadow 0.2s',
                                                            marginTop: 8
                                                        }}
                                                        onClick={this.handleToggleHistogram}
                                                        onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg, #388e3c 0%, #56ab2f 100%)'}
                                                        onMouseOut={e => e.currentTarget.style.background = this.state.showHistogram
                                                            ? 'linear-gradient(90deg, #43a047 0%, #a8e063 100%)'
                                                            : 'linear-gradient(90deg, #388e3c 0%, #a8e063 100%)'}
                                                    >
                                                        {this.state.showHistogram ? 'Ocultar histograma' : 'Ver histograma'}
                                                    </button>
                                                    <Collapse in={this.state.showHistogram} timeout="auto" unmountOnExit>
                                                        <div style={{ marginTop: 8, width: '100%' }}>
                                                            <Typography variant="subtitle2" style={{ fontWeight: 600, color: '#43a047', marginBottom: 4 }}>Histograma del índice</Typography>
                                                            <Bar
                                                                data={{
                                                                    labels: histData.labels,
                                                                    datasets: [{
                                                                        label: 'Frecuencia',
                                                                        data: histData.counts,
                                                                        backgroundColor: getPaletteForBins(indexPalettes[topVisibleLayer && (['NDVI','EVI','GNDVI','NDMI','MSI','BI','SAVI'].find(idx => topVisibleLayer.id && topVisibleLayer.id.toUpperCase().includes(idx))) || this.state.selectedIndexType] || ndviPalette, histData.counts.length),
                                                                        borderColor: getPaletteForBins(indexPalettes[topVisibleLayer && (['NDVI','EVI','GNDVI','NDMI','MSI','BI','SAVI'].find(idx => topVisibleLayer.id && topVisibleLayer.id.toUpperCase().includes(idx))) || this.state.selectedIndexType] || ndviPalette, histData.counts.length),
                                                                        borderWidth: 1.5,
                                                                        borderRadius: 6
                                                                    }]
                                                                }}
                                                                options={{
                                                                    responsive: true,
                                                                    plugins: { legend: { display: false } },
                                                                    scales: {
                                                                        x: {
                                                                            title: { display: false },
                                                                            ticks: { display: false, color: '#43a047' }
                                                                        },
                                                                        y: {
                                                                            title: { display: true, text: 'Frecuencia', color: '#43a047', font: { weight: 600 } },
                                                                            ticks: { color: '#43a047' }
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            <Typography variant="subtitle2" style={{ fontWeight: 600, color: '#43a047', marginTop: 8, marginLeft: 25 }}>
                                                                Valor del índice
                                                            </Typography>
                                                            <div style={{ marginTop: 24 }} />
                                                            {dataset && dataset.length > 0 && (
                                                                <div style={{ width: '100%', height: 200, padding: '0 8px', position: 'relative' }}>
                                                                    <Line
                                                                        data={{
                                                                            labels,
                                                                            datasets: [{
                                                                                label: this.state.selectedIndexType,
                                                                                data: valoresDataset,
                                                                                borderColor: '#1b5e20',
                                                                                backgroundColor: 'transparent',
                                                                                fill: false,
                                                                                tension: 0,
                                                                                pointRadius: 2,
                                                                                pointHoverRadius: 4,
                                                                                pointBackgroundColor: '#1b5e20',
                                                                                pointBorderColor: '#1b5e20',
                                                                                borderWidth: 1.5
                                                                            }]
                                                                        }}
                                                                        options={{
                                                                            responsive: true,
                                                                            maintainAspectRatio: true,
                                                                            plugins: { legend: { display: true } },
                                                                            scales: {
                                                                                x: {
                                                                                    title: { display: true, text: (this.state.bandDates && this.state.bandDates.length === (this.state.temporalValues ? this.state.temporalValues.length : 0)) ? 'Fecha seleccionada' : (this.state.dates && this.state.dates.length === (this.state.temporalValues ? this.state.temporalValues.length : 0)) ? 'Fecha' : 'Índice temporal', color: '#222', font: { style: 'italic' } },
                                                                                    ticks: {
                                                                                        maxRotation: 60,
                                                                                        minRotation: 60,
                                                                                        font: { size: 12 },
                                                                                        callback: function(value, index, values) {
                                                                                            const label = this.getLabelForValue(value);
                                                                                            if (typeof label === 'string' && label.match(/^\d{4}-\d{2}/)) {
                                                                                                return label.substring(0, 7);
                                                                                            }
                                                                                            return label;
                                                                                        }
                                                                                    }
                                                                                },
                                                                                y: {
                                                                                    title: { display: true, text: `${this.state.selectedIndexType} value`, color: '#222', font: { style: 'italic' } },
                                                                                    min: minY, max: maxY,
                                                                                    ticks: { font: { size: 12 } }
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
                                                                        <button
                                                                            onClick={() => this.setState({ showBigSurfaceChart: true })}
                                                                            style={{
                                                                                width: 30,
                                                                                height: 30,
                                                                                borderRadius: '50%',
                                                                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                                                                color: 'white',
                                                                                border: 'none',
                                                                                fontSize: 22,
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                cursor: 'pointer',
                                                                                boxShadow: '0 2px 8px rgba(67,233,123,0.12)',
                                                                                margin: 0,
                                                                                padding: 0
                                                                            }}
                                                                            aria-label="Ampliar gráfica"
                                                                        >
                                                                            <span style={{
                                                                                fontWeight: 'bold',
                                                                                fontSize: 26,
                                                                                lineHeight: '40px',
                                                                                width: '100%',
                                                                                textAlign: 'center',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                position: 'relative',
                                                                                top: '-1px'
                                                                            }}>+</span>
                                                                        </button>
                                                                        <span style={{ color: '#2e7d32', fontSize: 15, fontWeight: 500, userSelect: 'none', marginLeft: 10 }}>ampliar gráfica</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Collapse>
                                                </div>
                                            )}
                                        </div>
                                    </Collapse>

                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: blockSpatiotemporal ? 'not-allowed' : 'pointer',
                                            padding: '10px 0',
                                            borderBottom: '1px solid #eee',
                                            opacity: blockSpatiotemporal ? 0.4 : 1,
                                            background: blockSpatiotemporal ? '#f0f0f0' : undefined,
                                            color: blockSpatiotemporal ? '#aaa' : undefined
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography variant="body2"><strong><b>Análisis espaciotemporal</b></strong></Typography>
                                            <IconButton size="small" onClick={e => { if (!blockSpatiotemporal) { e.stopPropagation(); this.handleSpatiotemporalInfoClick(); } }} style={{ marginLeft: 6, color: blockSpatiotemporal ? '#aaa' : '#1976d2' }} disabled={blockSpatiotemporal}>
                                                <Icon style={{ fontSize: 18 }}>info</Icon>
                                            </IconButton>
                                        </div>
                                        <Icon style={{ cursor: blockSpatiotemporal ? 'not-allowed' : 'pointer', color: blockSpatiotemporal ? '#aaa' : undefined }} onClick={e => { if (!blockSpatiotemporal) { e.stopPropagation(); this.toggleSpatiotemporalLegend(); } }}>
                                            {this.state.showSpatiotemporalLegend ? 'expand_less' : 'expand_more'}
                                        </Icon>
                                    </div>
                                    <Collapse in={this.state.showSpatiotemporalInfo && !blockSpatiotemporal} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '12px 16px', background: '#f9f9f9', borderRadius: 8, margin: '8px 0' }}>
                                            <Typography variant="subtitle2" gutterBottom><b>¿Para qué sirve el análisis espaciotemporal?</b></Typography>
                                            <Typography variant="body2" style={{ textAlign: 'justify' }}>
                                                Esta funcionalidad permite analizar la evolución temporal de variables ambientales (precipitación, temperatura, etc.) en el área seleccionada, mostrando tendencias y patrones a lo largo del tiempo.
                                            </Typography>
                                        </div>
                                    </Collapse>
                                    <Collapse in={this.state.showSpatiotemporalLegend && !blockSpatiotemporal} timeout="auto" unmountOnExit>
                                        <div style={{ padding: '10px 0', textAlign: 'center', maxHeight: '350px', overflowY: 'auto' }}>
                                            {this.state.selectedSpatioVariables.length === 0 && (
                                                <Typography variant="body2" color="textSecondary" style={{ marginTop: 12 }}>No hay índices seleccionados para mostrar.</Typography>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 12 }}>
                                                {this.state.selectedSpatioVariables.map(variable => {
                                                    const vObj = spatioVariables.find(v => v.key === variable);
                                                    const { labels, data } = this.getSpatioTemporalData(variable);
                                                    return (
                                                        <div key={variable} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(33,150,243,0.08)', padding: 8, marginBottom: 8, position: 'relative', width: '100%', maxWidth: 400, minWidth: 0, boxSizing: 'border-box' }}>
                                                            <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#388e3c', marginBottom: 2 }}>{vObj ? vObj.label : variable}</Typography>
                                                            <div style={{ width: '100%', minWidth: 0, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Line
                                                                    data={{
                                                                        labels,
                                                                        datasets: [{
                                                                            label: vObj ? vObj.label : variable,
                                                                            data,
                                                                            borderColor: '#388e3c',
                                                                            backgroundColor: 'rgba(56,142,60,0.08)',
                                                                            fill: true,
                                                                            tension: 0.2,
                                                                            pointRadius: 2,
                                                                            pointHoverRadius: 4,
                                                                            pointBackgroundColor: '#388e3c',
                                                                            pointBorderColor: '#388e3c',
                                                                            borderWidth: 2
                                                                        }]
                                                                    }}
                                                                    options={{
                                                                        responsive: true,
                                                                        maintainAspectRatio: false,
                                                                        plugins: { legend: { display: false } },
                                                                        scales: {
                                                                            x: {
                                                                                title: { display: false, text: '' },
                                                                                ticks: {
                                                                                    maxRotation: 60,
                                                                                    minRotation: 60,
                                                                                    font: { size: 12 },
                                                                                    callback: function(value, index, values) {
                                                                                        const label = this.getLabelForValue(value);
                                                                                        if (typeof label === 'string' && label.match(/^\d{4}-\d{2}/)) {
                                                                                            return label.substring(0, 7);
                                                                                        }
                                                                                        return label;
                                                                                    }
                                                                                }
                                                                            },
                                                                            y: {
                                                                                title: { display: true, text: vObj ? vObj.label : variable, color: '#388e3c', font: { style: 'italic' } },
                                                                                ticks: { font: { size: 12 } }
                                                                            }
                                                                        }
                                                                    }}
                                                                    height={120}
                                                                    width={350}
                                                                />
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                                                                <button
                                                                    onClick={() => this.setState({ showBigSpatioChart: variable })}
                                                                    style={{
                                                                        width: 28,
                                                                        height: 28,
                                                                        borderRadius: '50%',
                                                                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        fontSize: 20,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        cursor: 'pointer',
                                                                        boxShadow: '0 2px 8px rgba(67, 233, 123, 0.12)',
                                                                        margin: 0,
                                                                        padding: 0
                                                                    }}
                                                                    aria-label="Ampliar gráfica"
                                                                >
                                                                    <span style={{ fontWeight: 'bold', fontSize: 22, lineHeight: '28px', width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', top: '-1px' }}>+</span>
                                                                </button>
                                                                <span style={{ color: '#2e7d32', fontSize: 14, fontWeight: 500, userSelect: 'none', marginLeft: 8 }}>ampliar gráfica</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </Collapse>
                                </div>
                            </Collapse>
                        </div>
                    </fieldset>
                )}

                {this.state.showBigSurfaceChart && (
                    <div
                        onClick={() => this.setState({ showBigSurfaceChart: false })}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(0,0,0,0.7)',
                            zIndex: 3000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <div
                            style={{
                                background: 'white',
                                borderRadius: 16,
                                boxShadow: '0 8px 32px rgba(33,150,243,0.25)',
                                padding: 32,
                                minWidth: 600,
                                minHeight: 400,
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <Line
                                data={{
                                    labels,
                                    datasets: [{
                                        label: this.state.selectedIndexType,
                                        data: valoresDataset,
                                        borderColor: '#1b5e20',
                                        backgroundColor: 'transparent',
                                        fill: false,
                                        tension: 0,
                                        pointRadius: 2,
                                        pointHoverRadius: 4,
                                        pointBackgroundColor: '#1b5e20',
                                        pointBorderColor: '#1b5e20',
                                        borderWidth: 1.5
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: true } },
                                    scales: {
                                        x: {
                                            title: { display: true, text: (this.state.bandDates && this.state.bandDates.length === (this.state.temporalValues ? this.state.temporalValues.length : 0)) ? 'Fecha seleccionada' : (this.state.dates && this.state.dates.length === (this.state.temporalValues ? this.state.temporalValues.length : 0)) ? 'Fecha' : 'Índice temporal', color: '#222', font: { style: 'italic' } },
                                            ticks: {
                                                maxRotation: 60,
                                                minRotation: 60,
                                                font: { size: 16 },
                                                callback: function(value, index, values) {
                                                    const label = this.getLabelForValue(value);
                                                    if (typeof label === 'string' && label.match(/^\d{4}-\d{2}/)) {
                                                        return label.substring(0, 7);
                                                    }
                                                    return label;
                                                }
                                            }
                                        },
                                        y: {
                                            title: { display: true, text: `${this.state.selectedIndexType} value`, color: '#222', font: { style: 'italic' } },
                                            min: minY, max: maxY,
                                            ticks: { font: { size: 16 } }
                                        }
                                    }
                                }}
                                height={400}
                                width={800}
                            />
                        </div>
                    </div>
                )}

                {this.state.showBigSpatioChart && (
                    <div
                        onClick={() => this.setState({ showBigSpatioChart: null })}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(0,0,0,0.7)',
                            zIndex: 3000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <div
                            style={{
                                background: 'white',
                                borderRadius: 16,
                                boxShadow: '0 8px 32px rgba(33,150,243,0.25)',
                                padding: 32,
                                minWidth: 1200,
                                maxWidth: '99vw',
                                minHeight: 400,
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {(() => {
                                const variable = this.state.showBigSpatioChart;
                                const vObj = spatioVariables.find(v => v.key === variable);
                                const { labels, data } = this.getSpatioTemporalData(variable);
                                return (
                                    <>
                                        <Typography variant="h6" style={{ fontWeight: 700, color: '#388e3c', marginBottom: 8 }}>{vObj ? vObj.label : variable}</Typography>
                                        <Line
                                            data={{
                                                labels,
                                                datasets: [{
                                                    label: vObj ? vObj.label : variable,
                                                    data,
                                                    borderColor: '#388e3c',
                                                    backgroundColor: 'rgba(56,142,60,0.08)',
                                                    fill: true,
                                                    tension: 0.2,
                                                    pointRadius: 2,
                                                    pointHoverRadius: 4,
                                                    pointBackgroundColor: '#388e3c',
                                                    pointBorderColor: '#388e3c',
                                                    borderWidth: 2
                                                }]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: true } },
                                                scales: {
                                                    x: {
                                                        title: { display: false, text: '' },
                                                        ticks: {
                                                            maxRotation: 60,
                                                            minRotation: 60,
                                                            font: { size: 16 },
                                                            callback: function(value, index, values) {
                                                                const label = this.getLabelForValue(value);
                                                                if (typeof label === 'string' && label.match(/^\d{4}-\d{2}/)) {
                                                                    return label.substring(0, 7);
                                                                }
                                                                return label;
                                                            }
                                                        }
                                                    },
                                                    y: {
                                                        title: { display: true, text: vObj ? vObj.label : variable, color: '#388e3c', font: { style: 'italic' } },
                                                        ticks: { font: { size: 16 } }
                                                    }
                                                }
                                            }}
                                            height={420}
                                            width={1300}
                                        />
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </MuiThemeProvider>
        );
    }
    
}

export default LayerController;
