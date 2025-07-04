/* Written by Ye Liu */

import React from 'react';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import grey from '@material-ui/core/colors/grey';

import emitter from '@utils/events.utils';

const theme = createTheme({
    palette: {
        primary: {
            main: grey[900]
        }
    }
});

const styles = {
    root: {
        position: 'fixed',
        top: 0,
        zIndex: 900
    },
    logoContainer: {
        height: '60px',
    },
    logo: {
        height: '55px',
    },
    flexContainer: {
        position: 'absolute',
        right: 12,
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start'
    },
    svgIcon: {
        width: 24,
        height: 24
    },
    fontIcon: {
        fontSize: 29,
        color: '#FFFFFF'
    },
    toolbar: {
        backgroundImage: 'linear-gradient(to top, #0ba360 0%, #3cba92 100%)'
    }
};

class Navigator extends React.Component {
    state = {
        loggedin: false,
        token:null
    }

    handleLoginClick = () => {
        // Display login modal
        emitter.emit('login');
    }

    handleLogoutClick = async () => {
        try {
            // Llamada al backend para cerrar sesión si existe endpoint (opcional)
            // await fetch('http://localhost:5001/api/auth/logout', { method: 'POST', credentials: 'include' });
            localStorage.removeItem('token');
            localStorage.removeItem('jwt');
            document.cookie.split(';').forEach(function(c) {
                document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
            });
            emitter.emit('removeAllLayer');
            emitter.emit('removeDataset');
            emitter.emit('removeAllDataset');
            emitter.emit('handleDatasetRemove');
            emitter.emit('showSnackbar', 'success', 'Logout successfully.');
            this.setState({ token: null, loggedin: false });
            // Mostrar el Register (pantalla de login/registro)
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            } else {
                // Si ya está en la página principal, forzar el estado para mostrar el login
                emitter.emit('openRegister');
            }
        } catch (error) {
            emitter.emit('showSnackbar', 'error', 'Error al cerrar sesión.');
        }
    }

    handleToken = (token) => {
        console.log('Received token:', token);
        // Aquí puedes hacer algo con los datos, como establecer el estado
        this.setState({ token: token });
    }

    componentDidMount() {
        // Bind event listener
        this.setLoginStateListener = emitter.addListener('setLoginState', e => {
            this.setState({
                loggedin: e
            })
        });
        emitter.on('handleToken', this.handleToken);
    }

    componentWillUnmount() {
        // Remove event listener
        emitter.removeListener(this.setLoginStateListener);
    }

    render() {
        return (
            <MuiThemeProvider theme={theme} >
                <AppBar style={styles.root} position="static">
                    <Toolbar style={styles.toolbar}>
                        {/* Logo */}
                        <a style={styles.logoContainer} href="https://evenor-tech.com/">
                        <img style={styles.logo} src="./static/assets/logo.png" alt="Evenor Tech Logo" />
                        </a>

                        &nbsp;
                        &nbsp;
                        &nbsp;
                        &nbsp;

                        <a style={styles.logoContainer} href="#">
                        <img style={styles.logo} src="./static/assets/indibiolivar.png" alt="Indibio Olivar Logo" />
                        </a>

                        {/* Icons */}

                        <div style={styles.flexContainer}>
                            {/* Botón de logout SIEMPRE visible para pruebas */}
                            <Tooltip title="Cerrar sesión" aria-label="Cerrar sesión" enterDelay={200}>
                                <IconButton className="icon-container" aria-label="Cerrar sesión" color="inherit" onClick={this.handleLogoutClick}>
                                    <Icon style={styles.fontIcon}>logout</Icon>
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="About" aria-label="About" enterDelay={200}>
                                <IconButton className="icon-container modal-trigger" aria-label="About" color="inherit" data-target="about">
                                    <Icon style={styles.fontIcon}>info_outline</Icon>
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="User Manual" aria-label="User Manual" enterDelay={200}>
                                <a href="https://tepro.es/" target="_blank" rel="noopener noreferrer" download>
                                    <IconButton className="icon-container modal-trigger" aria-label="User Manual" color="inherit" data-target="user_manual">
                                        <Icon style={styles.fontIcon}>picture_as_pdf_icon</Icon>
                                    </IconButton>
                                </a>
                            </Tooltip>
                        </div>
                    </Toolbar>
                </AppBar>
            </MuiThemeProvider>
        );
    }
}

export default Navigator;
