/* Written by Ye Liu */

import React from 'react';
import M from 'materialize-css';
import Slide from '@material-ui/core/Slide';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import { Button, FormControl, InputLabel, MenuItem, Select, Typography, Icon, IconButton } from '@material-ui/core';

import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import indigo from '@material-ui/core/colors/indigo';

import emitter from '@utils/events.utils';
import { ACCESS_TOKEN } from '@/config';

import '@styles/dataController.style.css';

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

class ModelController extends React.Component {
    state = {
        Ic:0,
        Ih:0, 
        Ig:0,
        Io:0,
        If:0,
        IoType:0,
        sustainabilityIndex:null,
        decision:null,
        open: false,
        resultUnwrap: false,
        addPointUnwrap: false,
        optionsOpen: false,
        searching: false,
        submitting: false,
        anchorEl: null,
        geometry: null,
        previewImage: null,
        previewMapUrl: null,
        previewCoordinate: {},
        loading: true,
        traces: [],
        precipitationData:[],
        temperatureData: [],
        watsatData: [],
        layoutTemperature: {
            title: 'Temperatura del Aire HC',
            xaxis: {
                title: 'Fecha',
                type: 'date'
            },
            yaxis: { title: 'Temperatura (°C)' }
        },
        layoutPrecipitation: {
            title: 'Precipitación',
            xaxis: {
                title: 'Fecha',
                type: 'date'
            },
            yaxis: { title: 'Precipitación (mm)' }
        },
        layoutWatsat: {
            title: 'Modelo Watsat',
            xaxis: {
                title: 'Fecha',
                type: 'date'
            },
            yaxis: { title: 'Contenido Volumétrico de Agua' }
        },
        layout: {
            barmode: 'stack',
            title: 'Avistamientos de insectos por día',
            xaxis: {
                title: 'Fecha',
                type: 'date'
            },
            yaxis: { title: 'Cantidad' }
        },
        items: [
            {id: 1, title: 'item #1'},
            {id: 2, title: 'item #2'},
            {id: 3, title: 'item #3'},
            {id: 4, title: 'item #4'},
            {id: 5, title: 'item #5'}
          ]
        ,
        data: [],
        searchOptions: [
            {
                value: 'gid',
                label: 'Gid',
                checked: true
            },
            {
                value: 'name',
                label: 'Name',
                checked: true
            },
            {
                value: 'pinyin',
                label: 'Pinyin',
                checked: true
            },
            {
                value: 'introduction',
                label: 'Introduction',
                checked: false
            }
        ]
    }

    calculateSustainabilityIndex = () => {
        let IoValue = this.state.Io === 1 ? this.state.IoType : 0; // Ajustar el valor de Io basado en si se aplica o no fertilizante
        const index = 2.45 * this.state.Ic + 2.18 * this.state.Ih + 1.64 * this.state.Ig + 1.09 * IoValue + 1 * this.state.If;
        this.setState({
            sustainabilityIndex:index
        })
    };

    handleDecision = (choice) => {
        this.setState({ decision: choice });
      };    

    initMaterialbox = () => {
        var elems = document.querySelectorAll('.materialboxed');
        M.Materialbox.init(elems, {
            onOpenStart: (e) => {
                e.parentNode.style.overflow = 'visible';
            },
            onCloseEnd: (e) => {
                e.parentNode.style.overflow = 'hidden';
            }
        });
    }
    
    resetPreviewImage = () => {
        this.setState({
            previewImage: null
        });
    }

    resetNewPointData = () => {
        this.setState({
            previewMapUrl: null,
            geometry: null,
            previewCoordinate: {}
        });
    }

    handleCloseClick = () => {
        this.setState({
            open: false
        });
    }

    handleAddClick = () => {
        // Get GeoJSON from map
        emitter.emit('getPoint');

        // Exit search mode
        this.handleWrapClick();

        // Initialize new point data
        this.resetPreviewImage();
        this.resetNewPointData();

        // Wrap add point panel
        this.setState({
            addPointUnwrap: false
        });
    }

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

    handleImageChange = (e) => {
        // Check if file selected
        if (!e.target.files[0]) {
            return;
        }

        // Check image size (smaller than 1MB)
        if (e.target.files[0].size > 1048576) {
            emitter.emit('showSnackbar', 'error', 'Error: Image must be smaller than 1MB.');
            return;
        }

        // Encode image with base64
        this.state.reader.readAsDataURL(e.target.files[0]);
    }

    handleDoneEdit = () => {
        // Reset preview image
        this.resetPreviewImage();

        // Initialize Materialbox
        setTimeout(this.initMaterialbox, 800);
    }

    handleSearchOptionsClick = () => {
        this.setState({
            optionsOpen: true
        });
    }

    handleSearchOptionsClose = () => {
        this.setState({
            optionsOpen: false
        });
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

    handleSearchClick = () => {
        // Exit add point mode
        this.handleCancelClick();

        // Get keyword
        var keyword = document.getElementById('search-box').value;
        if (!keyword) {
            return;
        }

        // Show searching progress
        this.setState({
            searching: true
        });

        // Get search options
        var options = {};
        this.state.searchOptions.map(item => {
            options[item.value] = item.checked;
            return true;
        });

        // Initiate request
    }

    handlePreviewClick = (e, data) => {
        // Show marker and popup on map
        emitter.emit('displayTempLayer', data);
    }

    handlePreviewMapClick = () => {
        // Get GeoJSON from map
        emitter.emit('getPoint');

        this.setState({
            addPointUnwrap: false
        });
    }

    handleSelectChange = (event) => {
        this.setState({ [event.target.name]: Number(event.target.value) });
    };

    calculateSustainabilityIndex = () => {
        const { Ic, Ih, Ig, Io, If, IoType } = this.state;
        let IoValue = Io === 1 ? IoType : 0;
        const index = 2.45 * Ic + 2.18 * Ih + 1.64 * Ig + 1.09 * IoValue + 1 * If;
        this.setState({ sustainabilityIndex: index });
    };


    componentDidMount() {
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
        this.openModelControllerListener = emitter.addListener('openModelController', () => {
            this.setState({
                open: true
            });
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
    }

    
    setIc(e){
        this.setState({
            Ic:e
        })
    }
    setIh(e){
        this.setState({
            Ih:e
        })
    }
    setIg(e){
        this.setState({
            Ig:e
        })
    }
    setIo(e){
        this.setState({
            Io:e
        })
    }
    setIoType(e){
        this.setState({
            IoType:e
        })
    }
    setIf(e){
        this.setState({
            If:e
        })
    }
    processTemperatureData = (data) => {
        const trace = {
            type: 'scatter', 
            mode: 'lines',
            x: data.map(item => new Date(item.sampling_date)),
            y: data.map(item => item.measurement_value),
            name: 'Temperatura del Aire HC',
        };

        this.setState(({
            temperatureData: [trace],
            loading: false // Mantiene el estado de carga si hay más datos por cargar
        }));
    }

    processPrecipitationData = (data) => {
        const trace = {
            type: 'scatter',
            mode: 'lines',
            x: data.map(item => new Date(item.sampling_date)),
            y: data.map(item => item.measurement_value),
            name: 'Precipitación'
        };

        this.setState({ precipitationData: [trace], loading: false });
    }


    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.openModelControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.addPointListener);
        emitter.removeListener(this.updatePointListener);

        // Destory Materialbox
        var elems = document.querySelectorAll('.materialboxed');
        elems.forEach(elem => {
            if (typeof elem.destroy === 'function') elem.destroy();
        });
    }

    render() {        
        const { open, Ic, Ih, Ig, Io, If, IoType, sustainabilityIndex} = this.state;

        return (
            <MuiThemeProvider theme={theme}>
                <Slide direction="left" in={open}>
                    <Card style={styles.root}>
                        {/* Card header */}
                        <CardContent style={styles.header}>
                            <Typography gutterBottom style={{ fontFamily: 'Lato, Arial, sans-serif', color:'white', fontWeight:'3' }} variant="h5" component="h2">Visualizador de capas</Typography>
                            <Typography variant="body2" color="textSecondary">Árbol de Decisión para la Sostenibilidad del Olivar</Typography>
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>
                        <CardContent style={styles.content}>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>¿Mantiene una cubierta vegetal en el suelo de su olivar?</InputLabel>
                                <Select name="Ic" value={Ic} onChange={this.handleSelectChange}>
                                    <MenuItem value={0}>No</MenuItem>
                                    <MenuItem value={1}>En bandas</MenuItem>
                                    <MenuItem value={2}>Toda la superficie menos los ruedos</MenuItem>
                                    <MenuItem value={3}>Toda la superficie, incluyendo los ruedos</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>¿Conserva algún tipo de vegetación natural en su olivar?</InputLabel>
                                <Select name="Ih" value={Ih} onChange={this.handleSelectChange}>
                                    <MenuItem value={0}>No</MenuItem>
                                    <MenuItem value={1}>Conservo algunos árboles dispersos</MenuItem>
                                    <MenuItem value={2}>Conservo parches de vegetación natural</MenuItem>
                                    <MenuItem value={3}>Conservo una o varias manchas importantes de monte mediterráneo</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>¿Suele incorporar ganado a pastar dentro de su olivar?</InputLabel>
                                <Select name="Ig" value={Ig} onChange={this.handleSelectChange}>
                                    <MenuItem value={0}>No</MenuItem>
                                    <MenuItem value={1}>Sí</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>¿Suministra a sus suelos algún tipo de fertilizante orgánico?</InputLabel>
                                <Select name="Io" value={Io} onChange={this.handleSelectChange}>
                                    <MenuItem value={0}>No</MenuItem>
                                    <MenuItem value={1}>Sí</MenuItem>
                                </Select>
                                {Io === 1 && (
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>¿Cuál de los siguientes fertilizantes orgánicos emplea?</InputLabel>
                                        <Select name="IoType" value={IoType} onChange={this.handleSelectChange}>
                                            <MenuItem value={1}>Restos triturados de la poda</MenuItem>
                                            <MenuItem value={1}>Alperujo compostado</MenuItem>
                                            <MenuItem value={1}>Estiércol</MenuItem>
                                            <MenuItem value={1}>Otros tipos</MenuItem>
                                            <MenuItem value={2}>Dos de los anteriores</MenuItem>
                                            <MenuItem value={3}>Tres o más de los anteriores</MenuItem>
                                        </Select>
                                    </FormControl>
                                )}
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>¿Cuál de los siguientes productos fitosanitarios NO aplica en su olivar?</InputLabel>
                                <Select name="If" value={If} onChange={this.handleSelectChange}>
                                    <MenuItem value={0}>Aplico todos los anteriores</MenuItem>
                                    <MenuItem value={1}>No aplico fungicidas</MenuItem>
                                    <MenuItem value={2}>No aplico herbicidas</MenuItem>
                                    <MenuItem value={3}>No aplico pesticidas</MenuItem>
                                </Select>
                            </FormControl>
                            <Button variant="contained" color="primary" onClick={this.calculateSustainabilityIndex} style={{ marginTop: 20 }}>
                                Calcular Índice de Sostenibilidad
                            </Button>
                            {sustainabilityIndex !== null && (
                                <Typography variant="h6" style={{ marginTop: 20 }}>
                                    Índice de Sostenibilidad: {sustainabilityIndex.toFixed(2)}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Slide>
            </MuiThemeProvider >
        );
    }
}

export default ModelController;