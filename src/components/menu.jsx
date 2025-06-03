import React from 'react';



import SpeedDial from '@material-ui/lab/SpeedDial';

import SpeedDialIcon from '@material-ui/lab/SpeedDialIcon';

import SpeedDialAction from '@material-ui/lab/SpeedDialAction';

import Icon from '@material-ui/core/Icon';

import emitter from '@utils/events.utils';

import '@styles/menu.style.css';

const styles = {

    root: {

        position: 'fixed',

        right: 24,

        bottom: 24,

        zIndex: 1000

    }

};



class Menu extends React.Component {

    state = {

        open: false,

        actions: [

            {

                name: 'Cambiar Estilo',

                icon: <Icon>brush</Icon>,

                color: "red accent-2",

                callback: () => {

                    emitter.emit('closeAllController');

                    emitter.emit('openStyleController');

                    this.handleClose();

                }

            },
            
            {
                name: 'Cálculo índices especrales',
                icon: <Icon>satellite</Icon>,
                color: "grey",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openBandController');
                    this.handleClose();
                }
            },
            {

                name: 'Análisis Espacio-Temporal',

                icon: <Icon>satellite_alt</Icon>,

                color: "orange",

                callback: () => {

                    emitter.emit('closeAllController');

                    emitter.emit('openSpatioTemporalAnalysisController');

                    this.handleClose();

                }

            },

            {

                name: 'Camino de Vegetación',

                icon: <Icon>image_search</Icon>,

                color: "blue",

                callback: () => {

                    emitter.emit('closeAllController');

                    emitter.emit('openVegInspectorController');

                    this.handleClose();

                }

            },
            {

                name: 'Modelo Rusle',

                icon: <Icon>landslide</Icon>,

                color: "#490EFF",

                callback: () => {

                    emitter.emit('closeAllController');

                    emitter.emit('openRusleController');

                    this.handleClose();

                }

            },   
            {
                name: 'Modelos',
                icon: <Icon>psychology</Icon>,
                color: "purple darken-1",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openModelController');
                    this.handleClose();
                }
            },

            {
                name: 'Buscar Parcela',
                icon: <Icon>search</Icon>,
                color: "leaf green",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openSearchController');
                    this.handleClose();
                }
            },

            {

                name: 'Visualizador de Capas',

                icon: <Icon>grass</Icon>,

                color: "green",

                callback: () => {

                    emitter.emit('closeAllController');

                    emitter.emit('openBushEncoracherController');

                    this.handleClose();

                }

            },

            {
                name: 'Modelo distribución de especies',
                icon: <Icon>casino</Icon>, // icono aleatorio
                color: "#74532", // brow

                callback: () => {

                    emitter.emit('closeAllController');

                    emitter.emit('openMaxentController');

                    this.handleClose();

                }
            },

            {
                name: 'Soil Organic Carbon Predictor',
                icon: <Icon>science</Icon>,
                color: "#795548", // brown

                callback: () => {

                    emitter.emit('closeAllController');

                    emitter.emit('openSocController');

                    this.handleClose();

                }
            },

            {

                name: 'Configurador de Capas',

                icon: <Icon>layers</Icon>,

                color: "yellow darken-1",

                callback: () => {

                    emitter.emit('closeAllController');

                    emitter.emit('openLayerController');

                    this.handleClose();

                }

            }

        ]

    }



    handleClick = () => {

        this.setState(state => ({

            open: !state.open,

        }));

    }



    handleOpen = () => {

        this.setState({

            open: true

        });

    }



    handleClose = () => {

        this.setState({

            open: false

        });

    }



    componentDidMount() {

        // Bind event listener

        this.openMenuListener = emitter.addListener('openMenu', () => {

            this.setState({

                open: true

            });

        });

    }



    componentWillUnmount() {

        // Remove event listener

        emitter.removeListener(this.openMenuListener);

    }



    render() {

        return (

            <SpeedDial

                style={styles.root}

                open={this.state.open}

                ariaLabel="Menu"

                icon={<SpeedDialIcon icon={<Icon>menu</Icon>} openIcon={<Icon>clear</Icon>} />}

                onMouseEnter={this.handleOpen}

                onMouseLeave={this.handleClose}

                onClick={this.handleClick}

            >

                {this.state.actions.map(action => {

                    return (

                        <SpeedDialAction

                            key={action.name}

                            className={action.color}

                            icon={action.icon}

                            tooltipTitle={action.name}

                            onClick={action.callback} />

                    );

                })}

            </SpeedDial>

        );

    }

}



export default Menu;