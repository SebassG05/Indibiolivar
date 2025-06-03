/* Written by Ye Liu */

import React from 'react';
import M from 'materialize-css';
import Slide from '@material-ui/core/Slide';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CircularProgress from '@material-ui/core/CircularProgress';
import { Button, FormControl, InputLabel, MenuItem, Select, Typography, Tab, Tabs, Box, Icon, IconButton } from '@material-ui/core';

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

class BiodiversityController extends React.Component {
    state = {
        Ic:0,
        Ih:0, 
        Ig:0,
        Io:0,
        If:0,
        IoType:0,
        activeTab: 0,
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
        loading: false,
        traces: [],
        precipitationData:[],
        temperatureData: [],
        watsatData: [],
        shannonIndex: null,
            chao1Index: null,
            chao2Index: null,
            error: null,

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
        this.openBiodivControllerListener = emitter.addListener('openBiodivController', () => {
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

    handleCalculate = async (endpoint, resultKey) => {
        this.setState({ error: null, loading: true });

        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Error al procesar la solicitud');
            const data = await response.json();
            this.setState({ [resultKey]: data });
        } catch (err) {
            console.error(err);
            this.setState({ error: 'Error al calcular el índice. Intenta nuevamente.' });
        } finally {
            this.setState({ loading: false });
        }
    };

    renderTabContent = (index) => {
        const { loading, error, shannonIndex, chao1Index, chao2Index } = this.state;

        if (index === 0) {
            return (
                <>
                    <Button
                        variant="contained"
                        color="primary"
                        style={styles.button}
                        onClick={() => this.handleCalculate('http://localhost:5003/api/shannon', 'shannonIndex')}
                        disabled={loading}
                    >
                        Calcular Índice Shannon
                    </Button>
                    {loading && <CircularProgress style={styles.loading} />}
                    {error && (
                        <Typography color="error" style={styles.result}>
                            {error}
                        </Typography>
                    )}
                    {shannonIndex && (
                        <Typography style={styles.result}>
                            Índice de Shannon: {shannonIndex.shannon_index.toFixed(2)}
                        </Typography>
                    )}
                </>
            );
        }

        if (index === 1) {
            return (
                <>
                    <Button
                        variant="contained"
                        color="primary"
                        style={styles.button}
                        onClick={() => this.handleCalculate('http://localhost:5003/api/chao1', 'chao1Index')}
                        disabled={loading}
                    >
                        Calcular Índice Chao1
                    </Button>
                    {loading && <CircularProgress style={styles.loading} />}
                    {error && (
                        <Typography color="error" style={styles.result}>
                            {error}
                        </Typography>
                    )}
                    {chao1Index && (
                        <Typography style={styles.result}>
                            Índice Chao1: {chao1Index.chao1_index.toFixed(2)}
                        </Typography>
                    )}
                </>
            );
        }

        if (index === 2) {
            return (
                <>
                    <Button
                        variant="contained"
                        color="primary"
                        style={styles.button}
                        onClick={() => this.handleCalculate('http://localhost:5003/api/chao2', 'chao2Index')}
                        disabled={loading}
                    >
                        Calcular Índice Chao2
                    </Button>
                    {loading && <CircularProgress style={styles.loading} />}
                    {error && (
                        <Typography color="error" style={styles.result}>
                            {error}
                        </Typography>
                    )}
                    {chao2Index && (
                        <Typography style={styles.result}>
                            Índice Chao2: {chao2Index.chao2_index.toFixed(2)}
                        </Typography>
                    )}
                </>
            );
        }

        return null;
    };
    handleTabChange = (event, newValue) => {
        this.setState({ activeTab: newValue });
    };
    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.openBiodivControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.addPointListener);
        emitter.removeListener(this.updatePointListener);

        // Destroy Materialbox
        var elems = document.querySelectorAll('.materialboxed');
        elems.forEach(elem => {
            if (typeof elem.destroy === 'function') elem.destroy();
        });
    }

    render() {        
        const { activeTab } = this.state;

        return (
            <MuiThemeProvider theme={theme}>
                                <Slide direction="left" in={this.state.open}>

                                <Card style={styles.root}>
                                <CardContent style={styles.header}>
                            <Typography gutterBottom style={{ fontFamily: 'Lato, Arial, sans-serif', color:'white', fontWeight:'3' }} variant="h5" component="h2">Cálculo de Índices de Biodiversidad</Typography>
                            <Typography variant="body2" color="textSecondary">Cálculo de Índices de Biodiversidad</Typography>
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>

                    <Tabs
                        value={activeTab}
                        onChange={this.handleTabChange}
                        indicatorColor="secondary"
                        textColor="inherit"
                        variant="fullWidth"
                        style={styles.tabs}
                    >
                        <Tab label="Shannon" />
                        <Tab label="Chao1" />
                        <Tab label="Chao2" />
                    </Tabs>
                    <CardContent>
                        <Box>{this.renderTabContent(activeTab)}</Box>
                    </CardContent>
                </Card>
                </Slide>
            </MuiThemeProvider>
        );
    }
}

export default BiodiversityController;