/* Written by Ye Liu */

import React from 'react';
import Slide from '@material-ui/core/Slide';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import { Typography, Icon, IconButton } from '@material-ui/core';
import Box from '@mui/material/Box';
import InfoOutlined from '@material-ui/icons/InfoOutlined';
import Collapse from '@material-ui/core/Collapse';
import Paper from '@material-ui/core/Paper';
import CloseIcon from '@material-ui/icons/Close';
import Lottie from 'lottie-react';
import treeGrow from '@/assets/tree-grow.json';
import Fade from '@material-ui/core/Fade';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import indigo from '@material-ui/core/colors/indigo';

import emitter from '@utils/events.utils';
import { ACCESS_TOKEN } from '@/config';

import '@styles/dataController.style.css';

import HorizontalLinearStepperAOI from '../componentsJS/StepperAoi';

const theme = createTheme({
    palette: {
        primary: {
            main: indigo.A200
        }
    }
});

const styles = {
    root: {
        position: 'fixed',
        top: 74,
        right: 10,
        borderRadius: 4,
        minWidth: 350,
        margin: 0,
        zIndex: 900
    },
    value: '2',
    rooot: {
        width: '100%',
    },
    heading: {
        fontSize: theme.typography.pxToRem(15),
        flexBasis: '33.33%',
        flexShrink: 0,
    },
    secondaryHeading: {
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary,
    },
    header: {
        backgroundColor: 'rgb(138, 213, 137)'
    },
    content: {
        paddingBottom: 16
    },
    closeBtn: {
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 22
    },
    searchField: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: 40,
        padding: '2px 4px'
    },
    searchBox: {
        marginLeft: 8,
        flex: 1,
        border: 'none !important'
    },
    searchBoxBtn: {
        padding: 8
    },
    searchOptionsContainer: {
        padding: '5px 2px'
    },
    searchOption: {
        color: 'rgba(0, 0, 0, 0.6)',
        cursor: 'pointer'
    },
    searchBoxProgress: {
        marginRight: 8
    },
    searchBoxDivider: {
        width: 1,
        height: 28,
        margin: 4
    },
    resultWrapperOpen: {
        maxWidth: 800
    },
    resultWrapperClosed: {
        maxWidth: 350
    },
    resultContainer: {
        paddingTop: 0,
        paddingBottom: 0
    },
    resultTable: {
        boxShadow: 'none'
    },
    uploadBoxInput: {
        display: 'none'
    },
    uploadBoxBtnEdit: {
        width: 40,
        height: 40,
        lineHeight: '40px',
        textAlign: 'center',
        borderRadius: '50%',
        fontSize: 22
    },
    wrapBtn: {
        position: 'absolute',
        bottom: 12,
        left: 18,
        padding: 10,
        fontSize: 24
    },
    addPointWrapperOpen: {
        maxWidth: 350
    },
    addPointWrapperClose: {
        width: 0
    },
    uploadBoxBtnAdd: {
        width: 90,
        height: 90,
        lineHeight: '90px',
        textAlign: 'center',
        borderRadius: '50%',
        fontSize: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.08)'
    },
    previewImageContainer: {
        display: 'flex',
        alignItems: 'center'
    },
    nameTextField: {
        margin: '0 20px 0 13px'
    },
    pinyinTextField: {
        margin: '10px 20px 10px 13px'
    },
    introTextField: {
        width: '100%',
        marginTop: 5
    },
    locationImageContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    locationImage: {
        display: 'block',
        marginTop: 5,
        width: 225,
        height: 140,
        borderRadius: 3,
        cursor: 'pointer'
    },
    locationLabel: {
        display: 'block',
        marginTop: 6
    },
    actions: {
        paddingTop: 10
    },
    saveBtn: {
        display: 'inline-block',
        position: 'relative',
        marginRight: 10
    },
    saveBtnProgress: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
    }
};

class BandController extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            open: false,
            showInfo: false,
            showDateInfo: false,
            currentIndexType: 'NDVI',
            activeStep: 0,
            loading: false,
            startDate: '',
            endDate: '',
        };
    }

    componentDidMount() {
        // Leer fechas de localStorage al montar
        const savedStartDate = localStorage.getItem('startDate');
        const savedEndDate = localStorage.getItem('endDate');
        if (savedStartDate || savedEndDate) {
            this.setState({
                startDate: savedStartDate || '',
                endDate: savedEndDate || ''
            });
        }

        // Initialize popover
        var anchorEl = document.getElementById('anchorEl');

        // Initialize file reader
        var reader = new FileReader();
        reader.onload = (e) => {
            // Get image info
            var image = new Image();
            image.src = e.target.result;

            // Construct preview image object
            var previewImage = {
                longitude: image.height > image.width,
                src: e.target.result
            }

            // Preview image
            this.setState({
                previewImage: previewImage
            });
        };

        this.setState({
            reader: reader,
            anchorEl: anchorEl
        });

        // Bind event listeners
        this.openBandControllerListener = emitter.addListener('openBandController', () => {
            this.setState({
                open: true
            });
            emitter.emit('setActiveTool', 'surfaceAnalysis'); // Notifica herramienta activa
        });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({
                open: false
            });
        });

        this.updatePointListener = emitter.addListener('setPoint', (feature, styleCode, zoom) => {
            var [lng, lat] = feature.geometry.coordinates;
            var previewMapUrl = `https://api.mapbox.com/styles/v1/${styleCode}/static/pin-s+f00(${lng},${lat})/${lng},${lat},${zoom},0,1/250x155@2x?access_token=${ACCESS_TOKEN}`;

            this.setState({
                addPointUnwrap: true,
                previewMapUrl: previewMapUrl,
                geometry: feature,
                previewCoordinate: {
                    lng: parseFloat(lng).toFixed(3),
                    lat: parseFloat(lat).toFixed(3)
                }
            });
        });

        this.moveURListener = emitter.addListener('moveURL', () => {
            this.moveURL();
        });
    }

    handleDateChange = (name, value) => {
        // Guardar en localStorage y actualizar estado
        if (name === 'startDate' || name === 'endDate') {
            localStorage.setItem(name, value);
            this.setState({ [name]: value });
        }
    }

    handleCloseClick = () => {
        this.setState({
            open: false
        });
    }

    handleChange = (event, newValue) => {
        this.setState({
            value: newValue
        });
    };

    handleInfoClick = () => {
        this.setState((prev) => ({ showInfo: !prev.showInfo }));
    };

    handleDateInfoClick = () => {
        this.setState((prev) => ({ showDateInfo: !prev.showDateInfo }));
    };

    handleIndexTypeChange = (indexType) => {
        this.setState({ currentIndexType: indexType });
        emitter.emit('indexTypeChanged', indexType); // Notificar a LayerController
    };

    handleStepChange = (step) => {
        this.setState({ activeStep: step });
    };

    handleDataSubmit = (data) => {
        this.setState({ loading: true });
        emitter.emit('setActiveTool', 'surfaceAnalysis');
        console.log('Datos enviados al backend:', data);
        // Si el Stepper envía un FormData directamente (nuevo flujo)
        if (data[0] instanceof FormData) {
            fetch('http://localhost:5002/get_image', {
                method: 'POST',
                body: data[0]
            })
                .then(response => response.json())
                .then(result => {
                    this.setState({ loading: false });
                    console.log('Respuesta del backend:', result);
                    if (result && result.success && Array.isArray(result.output)) {
                        this.setState({ url: result.output });
                        emitter.emit('newLayer', {
                            id: result.output[2],
                            visible: true,
                            transparency: 100,
                            min: result.output[4],
                            max: result.output[5],
                            dataset: result.output[6]
                        });
                        const fechas = Array.isArray(result.output[6]) ? result.output[6].map(d => d.Date).filter(Boolean) : [];
                        emitter.emit('setBandDates', fechas);
                        emitter.emit('moveURL', result.output);
                        emitter.emit('closeAllController');
                        emitter.emit('openLayerController');
                    } else if (result && result.output) {
                        this.setState({ url: result.output });
                        emitter.emit('moveURL', result.output);
                        emitter.emit('closeAllController');
                        emitter.emit('openLayerController');
                    } else {
                        emitter.emit('showSnackbar', 'error', 'No se recibió una URL de capa válida del backend.');
                    }
                })
                .catch(error => {
                    this.setState({ loading: false });
                    console.error('Error:', error);
                    emitter.emit('showSnackbar', 'error', 'Error al subir el archivo o procesar la capa.');
                });
        } else if (data[0].aoiDataFiles && data[0].aoiDataFiles.length > 0) {
            const formData = new FormData();
            formData.append('startDate', data[0].startDate);
            formData.append('endDate', data[0].endDate);
            formData.append('indexType', data[0].indexType);
            formData.append('aoiDataFiles', data[0].aoiDataFiles[0]);
            fetch('http://localhost:5002/get_image', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(result => {
                    this.setState({ loading: false });
                    console.log('Respuesta del backend:', result);
                    if (result && result.success && Array.isArray(result.output)) {
                        this.setState({ url: result.output });
                        emitter.emit('newLayer', {
                            id: result.output[2],
                            visible: true,
                            transparency: 100,
                            min: result.output[4],
                            max: result.output[5],
                            dataset: result.output[6]
                        });
                        const fechas = Array.isArray(result.output[6]) ? result.output[6].map(d => d.Date).filter(Boolean) : [];
                        emitter.emit('setBandDates', fechas);
                        emitter.emit('moveURL', result.output);
                        emitter.emit('closeAllController');
                        emitter.emit('openLayerController');
                    } else if (result && result.output) {
                        this.setState({ url: result.output });
                        emitter.emit('moveURL', result.output);
                        emitter.emit('closeAllController');
                        emitter.emit('openLayerController');
                    } else {
                        emitter.emit('showSnackbar', 'error', 'No se recibió una URL de capa válida del backend.');
                    }
                })
                .catch(error => {
                    this.setState({ loading: false });
                    console.error('Error:', error);
                    emitter.emit('showSnackbar', 'error', 'Error al subir el archivo o procesar la capa.');
                });
        } else {
            this.setState({ loading: false });
            emitter.emit('showSnackbar', 'error', 'Debes subir un archivo ZIP válido.');
        }
    };

    handleWrapClick = () => {
        // Remove temp layer
        emitter.emit('removeTempLayer');

        // Reset preview image
        this.resetPreviewImage();

        // Clear search box
        document.getElementById('search-box').value = '';

        this.setState({
            resultUnwrap: false
        });
    }

    moveURL = () => {
        var url = this.state.url
        this.setState({ movedURL: url });
        console.log(this.state.movedURL)

    }

    handleSearchOptionChange = (e) => {
        // Update search options
        var option = null;
        var flag = false;
        this.state.searchOptions.map(item => {
            if (item.value === e.currentTarget.value) {
                item.checked = e.currentTarget.checked;
                option = item;
            }
            flag = flag || item.checked;
            return true;
        });

        // Check whether at least one option checked
        if (!flag) {
            emitter.emit('showSnackbar', 'error', 'Error: Please select at least one option.');
            option.checked = true;
            return;
        }

        this.setState({
            searchOptions: this.state.searchOptions
        });
    }

    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.openBandControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.addPointListener);
        emitter.removeListener(this.updatePointListener);
        emitter.removeListener(this.moveURListener);

        var elems = document.querySelectorAll('.materialboxed');
        elems.map(elem => elem.destory());
    }

    render() {
        // Explicaciones genéricas para cada índice
        const indexExplanations = {
            NDVI: '<strong> El </strong>NDVI<strong> sirve principalmente para </strong> medir la densidad y salud de la vegetación verde.<strong> Cuando el valor de NDVI en un píxel aumenta, significa que la vegetación se ha vuelto más densa o más saludable, probablemente con mayor contenido de clorofila. Cuando el NDVI disminuye, indica deterioro de la vegetación: puede deberse a estrés hídrico, pérdida de plantas, cosecha o aparición de áreas de suelo desnudo.</strong> Es uno de los índices más utilizados en agricultura, monitoreo forestal y detección de cambios estacionales.',
            EVI: '<strong>El </strong>EVI <strong>se utiliza principalmente para </strong> monitorear vegetación en zonas muy densas, como selvas o bosques tropicales, <strong> donde el NDVI se puede saturar. También sirve para cultivos con estructuras densas. Si el valor de EVI en un píxel sube, señala que la cobertura vegetal se ha fortalecido o expandido. Si el EVI baja, indica una reducción en la densidad o salud de la vegetación, posiblemente por estrés ambiental, tala, etc.</strong> Su principal ventaja es que corrige mejor los efectos de polvo, atmósfera y suelo que el NDVI.',
            GNDVI: '<strong> El </strong> GNDVI es una variante del NDVI que, en lugar de usar la banda roja, utiliza la banda del verde. Esto lo hace más sensible al contenido de clorofila en la vegetación y menos saturado en zonas de vegetación muy densa.<strong> Cuando el valor de GNDVI en un píxel aumenta, significa que la vegetación ha mejorado su contenido de clorofila y está más saludable. Si el GNDVI disminuye, indica un descenso en la actividad fotosintética, posiblemente debido a estrés, sequía o pérdida de biomasa.</strong>Este índice es utilizado principalmente en agricultura de precisión para evaluar la salud de los cultivos, detectar estrés nutricional y optimizar fertilizaciones.',
            NDMI: '<strong> El </strong>NDMI <strong> se utiliza principalmente para </strong> detectar cambios en el contenido de humedad de la vegetación, especialmente en gestión forestal y detección temprana de sequías. Marca principalmente las zonas con encharcamiento.<strong> Cuando el valor de NDMI en un píxel sube, significa que la vegetación o el suelo ha ganado humedad y está en mejores condiciones hídricas. Si el NDMI baja, sugiere que las plantas o el suelo está perdiendo agua y podría estar entrando en estrés hídrico.</strong>',
            MSI: '<strong> El </strong>MSI <strong> sirve principalmente para</strong> evaluar el nivel de estrés hídrico en la vegetación.<strong> Cuando el MSI en un píxel aumenta, indica que las plantas están bajo mayor estrés por falta de agua (más secas). En cambio, si el MSI disminuye, significa que la vegetación está mejor hidratada y menos estresada.</strong> Este índice es muy útil para monitorear sequías o la eficiencia en riego agrícola.',
            BI: '<strong>El</strong> Brightness Index (BI) mide la intensidad general del reflejo de la superficie terrestre, combinando información de varias bandas espectrales, principalmente del rojo y del infrarrojo cercano.<strong> Cuando el valor de BI en un píxel aumenta, significa que la superficie se ha vuelto más brillante, lo que suele indicar presencia de suelos desnudos, áreas urbanas o superficies secas. Cuando el BI disminuye, indica superficies más oscuras, generalmente asociadas a vegetación densa o cuerpos de agua.</strong> Este índice se utiliza principalmente para diferenciar entre áreas de vegetación y áreas descubiertas o artificiales, y es muy útil en estudios de desertificación, expansión urbana y degradación de suelos.',
            SAVI: '<strong> El </strong>SAVI <strong>es utilizado principalmente para</strong> estudiar vegetación en áreas donde el suelo expuesto influye mucho en la imagen, como en zonas agrícolas en crecimiento o ambientes semiáridos. Para cultivos con entrecalles amplios sería ideal.<strong> Cuando el valor de SAVI en un píxel aumenta, significa que ha mejorado la cobertura vegetal o la actividad fotosintética. Si el valor de SAVI disminuye, sugiere reducción de vegetación, mayor exposición del suelo, o estrés de las plantas.</strong>'
        };

        const dateExplanation =
            '<strong> Las fechas seleccionadas se utilizan para  </strong> calcular la media o mediana del raster en ese periodo, permitiendo un análisis temporal más preciso y representativo de la variable de interés.';

        return (
            <ThemeProvider theme={theme}>
                <Fade in={this.state.loading} timeout={500}>
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        margin: 0,
                        padding: 0
                    }}>
                        <div style={{
                            width: 350,
                            height: 350,
                            background: 'rgba(138,213,137,0.85)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            boxShadow: '0 0 40px 10px rgba(138,213,137,0.25)',
                        }}>
                            <div style={{
                                width: 220,
                                height: 220,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: 0,
                                padding: 0,
                                flexDirection: 'column',
                                marginBottom: 30 // mueve el árbol hacia arriba
                            }}>
                                <Lottie animationData={treeGrow} loop={true} />
                            </div>
                            <div style={{
                                marginTop: 3,
                                fontSize: 22,
                                color: '#ffffff',
                                fontWeight: 600,
                                letterSpacing: 1,
                                fontFamily: 'Lato, Arial, sans-serif',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 32
                            }}>
                                <span className="loading-dots">Cargando capa<span className="dot">.</span><span className="dot">.</span><span className="dot">.</span></span>
                            </div>
                        </div>
                    </div>
                </Fade>
                <Slide direction="left" in={this.state.open}>
                    <Card style={styles.root}>
                        {/* Card header */}
                        <CardContent style={styles.header}>
                            <Typography gutterBottom style={{ fontFamily: 'Lato, Arial, sans-serif', color: 'white', fontWeight: '3' }} variant="h5" component="h2">Cálculo de variables</Typography>
                            <Typography variant="body2" color="textSecondary">Tanto ambientales como meteorológicas</Typography>
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>
                        {/* Paso 1: explicación de fechas */}
                        {this.state.activeStep === 0 && (
                            <>
                                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: 16 }}>
                                    <IconButton onClick={this.handleDateInfoClick} style={{ color: '#1976d2' }} aria-label="info-fecha">
                                        <InfoOutlined />
                                    </IconButton>
                                    <span style={{ marginLeft: 4, color: '#1976d2', fontWeight: 500, fontSize: 15, cursor: 'pointer' }} onClick={this.handleDateInfoClick}>
                                        ¿Por qué se piden las fechas?
                                    </span>
                                </div>
                                <Collapse in={this.state.showDateInfo}>
                                    <Paper elevation={3} style={{ margin: '16px auto', padding: 16, background: '#e3f2fd', position: 'relative', width: 400, minHeight: 60, maxWidth: '100%', overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                                        <IconButton size="small" style={{ position: 'absolute', top: 4, right: 4 }} onClick={this.handleDateInfoClick}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                        <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 8, textAlign: 'justify', color: '#1976d2' }}>
                                            <span style={{ fontWeight: 700 }}>¿Por qué se piden las fechas?</span>
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            style={{ fontWeight: 'bold', textAlign: 'justify', color: '#333', lineHeight: 1.6, letterSpacing: 0.1 }}
                                            dangerouslySetInnerHTML={{
                                                __html: '<strong>Las fechas seleccionadas se utilizan para</strong> calcular la media o mediana del raster en ese periodo, permitiendo un análisis temporal más preciso y representativo de la variable de interés.'
                                            }}
                                        />
                                    </Paper>
                                </Collapse>
                            </>
                        )}
                        {this.state.activeStep === 1 && (
                            <>
                                <Collapse in={this.state.showInfo}>
                                    <Paper elevation={3} style={{ margin: '16px auto', padding: 18, background: '#e3f2fd', position: 'relative', width: 400, minHeight: 80, maxWidth: '100%', overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                                        <IconButton size="small" style={{ position: 'absolute', top: 4, right: 4 }} onClick={this.handleInfoClick}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                        <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 8, textAlign: 'justify', color: '#1976d2' }}>¿Qué significa el índice seleccionado?</Typography>
                                        <Typography
                                            variant="body2"
                                            style={{ fontWeight: 'bold', textAlign: 'justify', color: '#333', lineHeight: 1.6, letterSpacing: 0.1 }}
                                            dangerouslySetInnerHTML={{
                                                __html: indexExplanations[this.state.currentIndexType]
                                            }}
                                        />
                                    </Paper>
                                </Collapse>
                            </>
                        )}
                        <CardContent style={styles.content}>
                            <HorizontalLinearStepperAOI
                                onSubmit={this.handleDataSubmit}
                                onIndexTypeChange={this.handleIndexTypeChange}
                                onStepChange={this.handleStepChange}
                                loading={this.state.loading}
                                setLoading={loading => this.setState({ loading })}
                                startDate={this.state.startDate}
                                endDate={this.state.endDate}
                                onDateChange={this.handleDateChange}
                            />
                            {this.state.activeStep === 1 && (
                                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: 16 }}>
                                    <IconButton onClick={this.handleInfoClick} style={{ color: '#1976d2' }} aria-label="info">
                                        <InfoOutlined />
                                    </IconButton>
                                    <span style={{ marginLeft: 4, color: '#1976d2', fontWeight: 500, fontSize: 15, cursor: 'pointer' }} onClick={this.handleInfoClick}>
                                        Más información
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Slide>
            </ThemeProvider >
        );
    }
}

export default BandController;