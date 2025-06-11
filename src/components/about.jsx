/* Written by Ye Liu */

import React from 'react';
import M from 'materialize-css';

const styles = {
    root: {
        position: 'fixed',
        top: 0,
        zIndex: 900
    },
    logoContainer: {
        height: '60px'
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
        fontSize: 29
    },
    toolbar:{
        backgroundImage: 'linear-gradient(to top, #0ba360 0%, #3cba92 100%)'
    }
};

class About extends React.Component {
    state = {
        modal: null
    }

    componentDidMount() {
        // Initialize Modal
        document.addEventListener('DOMContentLoaded', () => {
            var elem = document.getElementById('about');
            var modal = M.Modal.init(elem);
            this.setState({
                modal: modal
            });
        });
    }

    componentWillUnmount() {
        // Destroy Modal
        if (this.state.modal && typeof this.state.modal.destroy === 'function') {
            this.state.modal.destroy();
        }
    }

    render() {
        return (
            <div id="about" className="modal" style={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(60,186,146,0.2)' }}>
                <div className="modal-content" style={{ padding: '2.5rem 2.5rem 2rem 2.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.98)', boxShadow: '0 4px 24px rgba(60,186,146,0.10)' }}>
                    <h4 style={{ color: '#0ba360', fontWeight: 700, fontSize: '2rem', marginBottom: '1.5rem' }}>Sobre la herramienta</h4>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ color: '#3cba92', fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Desarrollador principal</h5>
                        <p style={{ fontSize: '1.08rem', color: '#222', margin: 0 }}><b>Evenor Tech</b></p>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ color: '#3cba92', fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Participantes</h5>
                        <ul style={{ fontSize: '1.08rem', color: '#222', margin: 0, paddingLeft: '1.2rem', listStyle: 'disc' }}>
                            <li><b>Javier Bravo Garcia</b></li>
                            <li><b>Sebastián Gandía Gutiérrez</b></li>
                            <li><b>Fernando Alonso Mertín</b></li>
                        </ul>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ color: '#3cba92', fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Créditos</h5>
                        <p style={{ fontSize: '1rem', color: '#555', margin: 0 }}>
                            Designed &amp; Written by&nbsp;
                            <a href="https://evenor-tech.com/" style={{ color: '#0ba360', textDecoration: 'underline' }}>Evenor-Tech</a>.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1 rem', marginTop: '2rem', justifyContent: 'center' }}>
                        <a style={{ height: '80px', display: 'flex', alignItems: 'center' }} href="https://evenor-tech.com/" target="_blank" rel="noopener noreferrer">
                            <img style={{ height: '250px', width: 'auto', objectFit: 'contain' }} src="./static/assets/evenor.png" alt="Logo Evenor Tech" />
                        </a>
                        <a style={{ height: '80px', display: 'flex', alignItems: 'center' }} href="https://indibiolivar.com/" target="_blank" rel="noopener noreferrer">
                            <img style={{ height: '130px', width: 'auto', objectFit: 'contain' }} src="./static/assets/indibiolivar.png" alt="Logo Indibiolivar" />
                        </a>
                    </div>
                </div>
                <div className="modal-footer" style={{ borderTop: '1px solid #e0e0e0', background: 'rgba(60,186,146,0.07)', borderRadius: '0 0 16px 16px' }}>
                    <button className="modal-close waves-effect waves-light btn-flat" style={{ color: '#0ba360', fontWeight: 600, fontSize: '1.1rem' }}>OK</button>
                </div>
            </div>
        );
    }
}

export default About;
