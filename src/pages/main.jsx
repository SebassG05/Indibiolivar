import React from 'react';
import { SnackbarProvider } from 'notistack';
import request from '@utils/request.utils';

import Snackbar from '@components/snackbar';
import About from '@components/about';
import Navigator from '@components/navigator';
import Menu from '@components/menu';
import Login from '@components/login';
import Feature from '@components/feature';
import StyleController from '@components/controllers/styleController';
import LayerController from '@components/controllers/layerController';
import Canvas from '@components/canvas';
import Popup from '@components/popup';
import '@styles/materialize.min.style.css';
import RusleController from '../components/controllers/rusleController';
import BushEncroacher from '../components/controllers/bushEncoracherController';
import SearchController from '../components/controllers/searchContoller';
import DataController from '../components/controllers/dataController';
import ModelController from '../components/controllers/modelController';
import ImportController from '../components/controllers/importController';
import VegInspectorController from '../components/controllers/vegInspectorController';
import SpatioTemporalAnalysisController from '../components/controllers/spatioTemporalAnalysisController';
import BandController from '../components/controllers/bandContoller';
import BiodiversityController from '../components/controllers/biodiversityController';
import Register from '@components/register'; 
import SocController from '../components/controllers/socController';
import MaxentController from '../components/controllers/MaxentController';

class Main extends React.Component {
    state = {
        showRegister: false, // Cambia a false por defecto
    };

    async validateToken() {
        const token = localStorage.getItem('token');
        if (!token || typeof token !== 'string' || token.length < 10) {
            localStorage.removeItem('token');
            this.setState({ showRegister: true });
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/auth/verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token.trim() }),
            });
            const data = await response.json();
            if (response.ok && data.valid) {
                this.setState({ showRegister: false });
            } else {
                localStorage.removeItem('token');
                this.setState({ showRegister: true });
            }
        } catch (err) {
            localStorage.removeItem('token');
            this.setState({ showRegister: true });
        }
    }

    handleRegisterClose = () => {
        this.setState({ showRegister: false }); 
    };

    componentDidMount() {
        this.validateToken();
        // Listen for openRegister event to always show the Register dialog after logout
        this.openRegisterListener = require('../utils/events.utils').default.addListener('openRegister', () => {
            this.setState({ showRegister: true });
        });
    }

    componentWillUnmount() {
        if (this.openRegisterListener) {
            require('../utils/events.utils').default.removeListener(this.openRegisterListener);
        }
    }

    render() {
        return (
            <SnackbarProvider maxSnack={3}>
                <React.Fragment>
                    {this.state.showRegister && (
                        <Register onRegisterComplete={this.handleRegisterClose} />
                    )}
                    <Snackbar />
                    <About />
                    <Navigator />
                    <Menu />
                    <Login />
                    <Feature />
                    <BushEncroacher />
                    <BandController />
                    <SearchController />
                    <SpatioTemporalAnalysisController />
                    <BiodiversityController />
                    <VegInspectorController />
                    <StyleController />
                    <LayerController />
                    <ModelController />
                    <DataController />
                    <ImportController />
                    <RusleController />
                    <SocController />
                    <MaxentController />
                    <Popup />
                    <Canvas />
                </React.Fragment>
            </SnackbarProvider>
        );
    }
}

export default Main;
