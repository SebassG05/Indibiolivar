import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import { GoogleLogin } from '@react-oauth/google'; // Import the new GoogleLogin component
import { validateEmail, validatePassword } from '../utils/validator';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { jwtDecode } from "jwt-decode"; // Corrected import: Use named import

const theme = createTheme({
    palette: {
        primary: {
            main: '#4CAF50', 
        },
        secondary: {
            main: '#388E3C', 
        },
    },
});

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class Register extends React.Component {
    state = {
        username: '',
        email: '',
        password: '',
        newPassword: '',
        confirmNewPassword: '', // Add state for confirm password
        isSubmitting: false,
        mode: 'login', // Default to login mode
        snackbarOpen: false,
        snackbarMessage: '',
        snackbarSeverity: 'info',
    };

    handleChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    handleSubmit = async () => {
        const { username, email, password, newPassword, confirmNewPassword, mode } = this.state; // Include confirmNewPassword

        // Add validation for password confirmation in forgotPassword mode
        if (mode === 'forgotPassword' && newPassword !== confirmNewPassword) {
            this.setState({
                snackbarOpen: true,
                snackbarMessage: 'New passwords do not match.',
                snackbarSeverity: 'error',
            });
            return; // Stop submission if passwords don't match
        }

        this.setState({ isSubmitting: true });

        let url = '';
        let body = {};

        if (mode === 'register') {
            url = 'https://indibiolivar.evenor-tech.com/api/auth/register';
            body = JSON.stringify({ username, email, password });
        } else if (mode === 'login') {
            url = 'https://indibiolivar.evenor-tech.com/api/auth/login';
            body = JSON.stringify({ username, password });
        } else if (mode === 'forgotPassword') {
            url = 'https://indibiolivar.evenor-tech.com/api/auth/reset-password'; // New endpoint
            body = JSON.stringify({ username, newPassword }); // Send username and new password
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: body,
            });

            const data = await response.json();

            if (response.ok) {
                let successMessage = '';
                if (mode === 'register') {
                    successMessage = 'User Registered Successfully!';
                } else if (mode === 'login') {
                    successMessage = 'Login Successful!';
                    if (data.token) {
                        localStorage.setItem('token', data.token); // Save token for session persistence
                    }
                } else if (mode === 'forgotPassword') {
                    successMessage = 'Password updated successfully!';
                }

                this.setState({
                    snackbarOpen: true,
                    snackbarMessage: successMessage,
                    snackbarSeverity: 'success',
                });

                if (mode === 'login' || mode === 'register') {
                    this.props.onRegisterComplete();
                } else if (mode === 'forgotPassword') {
                    this.toggleMode('login');
                }

            } else {
                this.setState({
                    snackbarOpen: true,
                    snackbarMessage: data.message || 'An error occurred',
                    snackbarSeverity: 'error',
                });
            }
        } catch (error) {
            console.error("Error during fetch:", error);
            this.setState({
                snackbarOpen: true,
                snackbarMessage: 'Network error or server unavailable.',
                snackbarSeverity: 'error',
            });
        } finally {
            this.setState({ isSubmitting: false });
        }
    };

    // New handler for @react-oauth/google success
    handleGoogleLoginSuccess = async (credentialResponse) => {
        console.log('Google Login Success (New Library):', credentialResponse);
        const idToken = credentialResponse.credential;

        if (!idToken) {
            console.error("No ID token received from Google.");
            this.setState({
                snackbarOpen: true,
                snackbarMessage: 'Google authentication failed: No token received.',
                snackbarSeverity: 'error',
            });
            return;
        }

        let googleId = null;
        let email = null;
        try {
            const decoded = jwtDecode(idToken);
            googleId = decoded.sub;
            email = decoded.email;
            console.log("Decoded JWT (client-side, for info only):", decoded);
        } catch (decodeError) {
            console.error("Error decoding JWT on client:", decodeError);
        }

        this.setState({ isSubmitting: true });

        try {
            const backendResponse = await fetch('https://indibiolivar.evenor-tech.com/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: idToken, googleId, email }), // Añade googleId y email
            });

            const data = await backendResponse.json();

            if (backendResponse.ok && data.token) {
                localStorage.setItem('token', data.token); // Guarda el token de sesión
            }

            if (backendResponse.ok) {
                this.setState({
                    snackbarOpen: true,
                    snackbarMessage: data.message || 'Google Login Successful!',
                    snackbarSeverity: 'success',
                    isSubmitting: false,
                });
                this.props.onRegisterComplete(); // Close the dialog
            } else {
                this.setState({
                    snackbarOpen: true,
                    snackbarMessage: data.message || 'Google login failed on the server.',
                    snackbarSeverity: 'error',
                    isSubmitting: false,
                });
            }
        } catch (error) {
            console.error("Error during Google login backend call:", error);
            this.setState({
                snackbarOpen: true,
                snackbarMessage: 'Network error or server unavailable during Google login.',
                snackbarSeverity: 'error',
                isSubmitting: false,
            });
        }
    };

    // New handler for @react-oauth/google error
    handleGoogleLoginError = (error) => {
        console.error('Google Login Failed (New Library):', error);
        this.setState({
            snackbarOpen: true,
            snackbarMessage: 'Google authentication failed. Please try again.',
            snackbarSeverity: 'error',
            isSubmitting: false,
        });
    };

    toggleMode = (mode) => {
        this.setState({
            mode,
            username: '',
            email: '',
            password: '',
            newPassword: '',
            confirmNewPassword: '', // Reset confirm password field
            snackbarOpen: false // Close snackbar on mode change
        });
    };

    render() {
        return (
            <MuiThemeProvider theme={theme}>
                <Dialog
                    open={true}
                    disableBackdropClick={true} 
                    disableEscapeKeyDown={true} 
                >
                    <div
                        style={{
                            padding: 40,
                            minWidth: 500,
                            minHeight: 350, 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                            <img
                                src="./static/assets/indibiolivar.png"
                                alt="Logo"
                                style={{ width: '150px', height: 'auto' }} 
                            />
                        </div>

                        {/* Conditionally render tabs only for login/register modes */}
                        {this.state.mode !== 'forgotPassword' && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    marginBottom: 20,
                                    width: '100%',
                                    borderBottom: '2px solid #ddd',
                                }}
                            >
                                <Button
                                    onClick={() => this.toggleMode('login')}
                                    style={{
                                        flex: 1,
                                        textTransform: 'none',
                                        fontWeight:
                                            this.state.mode === 'login'
                                                ? 'bold'
                                                : 'normal',
                                        borderBottom:
                                            this.state.mode === 'login'
                                                ? '4px solid #4CAF50'
                                                : 'none',
                                        color:
                                            this.state.mode === 'login'
                                                ? '#4CAF50'
                                                : '#888',
                                        fontSize: '18px',
                                        padding: '10px 0',
                                    }}
                                >
                                    Inicio de Sesión
                                </Button>
                                <Button
                                    onClick={() => this.toggleMode('register')}
                                    style={{
                                        flex: 1,
                                        textTransform: 'none',
                                        fontWeight:
                                            this.state.mode === 'register'
                                                ? 'bold'
                                                : 'normal',
                                        borderBottom:
                                            this.state.mode === 'register'
                                                ? '4px solid #4CAF50'
                                                : 'none',
                                        color:
                                            this.state.mode === 'register'
                                                ? '#4CAF50'
                                                : '#888',
                                        fontSize: '18px',
                                        padding: '10px 0',
                                    }}
                                >
                                    Registro
                                </Button>
                            </div>
                        )}

                        {this.state.mode === 'register' ? (
                            <>
                                <TextField
                                    name="username"
                                    label="Usuario"
                                    value={this.state.username}
                                    fullWidth
                                    margin="dense"
                                    onChange={this.handleChange}
                                    style={{ marginBottom: 20 }}
                                />
                                <TextField
                                    name="email"
                                    label="Correo Electrónico"
                                    value={this.state.email}
                                    fullWidth
                                    margin="dense"
                                    onChange={this.handleChange}
                                    style={{ marginBottom: 20 }}
                                />
                                <TextField
                                    name="password"
                                    label="Contraseña"
                                    type="password"
                                    value={this.state.password}
                                    fullWidth
                                    margin="dense"
                                    onChange={this.handleChange}
                                    style={{ marginBottom: 20 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    onClick={this.handleSubmit}
                                    disabled={this.state.isSubmitting}
                                    style={{
                                        backgroundColor: '#4CAF50',
                                        color: 'white',
                                        marginTop: 20,
                                        padding: '12px 0',
                                        fontSize: '16px',
                                    }}
                                >
                                    {this.state.isSubmitting ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        'Register'
                                    )}
                                </Button>
                            </>
                        ) : this.state.mode === 'login' ? (
                            <>
                                <TextField
                                    name="username"
                                    label="usuario"
                                    value={this.state.username}
                                    fullWidth
                                    margin="dense"
                                    onChange={this.handleChange}
                                    style={{ marginBottom: 20 }}
                                />
                                <TextField
                                    name="password"
                                    label="contraseña"
                                    type="password"
                                    value={this.state.password}
                                    fullWidth
                                    margin="dense"
                                    onChange={this.handleChange}
                                    style={{ marginBottom: 10 }}
                                />
                                <div style={{ width: '100%', textAlign: 'right', marginBottom: 10 }}>
                                    <span
                                        onClick={() => this.toggleMode('forgotPassword')}
                                        style={{
                                            color: '#4CAF50',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                    >
                                        Has olvidado tu contraseña?
                                    </span>
                                </div>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    onClick={this.handleSubmit}
                                    disabled={this.state.isSubmitting}
                                    style={{
                                        backgroundColor: '#4CAF50',
                                        color: 'white',
                                        marginTop: 20,
                                        padding: '12px 0',
                                        fontSize: '16px',
                                    }}
                                >
                                    {this.state.isSubmitting ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        'Iniciar Sesión'
                                    )}
                                </Button>
                            </>
                        ) : (
                            <>
                                <TextField
                                    name="username"
                                    label="Usuario o Email"
                                    value={this.state.username}
                                    fullWidth
                                    margin="dense"
                                    onChange={this.handleChange}
                                    style={{ marginBottom: 20 }}
                                />
                                <TextField
                                    name="newPassword"
                                    label="Nueva Contraseña"
                                    type="password"
                                    value={this.state.newPassword}
                                    fullWidth
                                    margin="dense"
                                    onChange={this.handleChange}
                                    style={{ marginBottom: 20 }}
                                />
                                <TextField
                                    name="confirmNewPassword"
                                    label="Confirmar Nueva Contraseña"
                                    type="password"
                                    value={this.state.confirmNewPassword}
                                    fullWidth
                                    margin="dense"
                                    onChange={this.handleChange}
                                    style={{ marginBottom: 20 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    onClick={this.handleSubmit}
                                    disabled={this.state.isSubmitting}
                                    style={{
                                        backgroundColor: '#4CAF50',
                                        color: 'white',
                                        marginTop: 20,
                                        padding: '12px 0',
                                        fontSize: '16px',
                                    }}
                                >
                                    {this.state.isSubmitting ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        'Actualizar Contraseña'
                                    )}
                                </Button>
                                <div style={{ marginTop: 15, textAlign: 'center' }}>
                                    <span
                                        onClick={() => this.toggleMode('login')}
                                        style={{
                                            color: '#4CAF50',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                    >
                                        Volver al inicio de sesión
                                    </span>
                                </div>
                            </>
                        )}

                        {(this.state.mode === 'login' || this.state.mode === 'register') && (
                            <>
                                {this.state.mode === 'login' && (
                                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                                        <span style={{ fontSize: '14px', color: '#888' }}>
                                            No tienes una cuenta?{' '}
                                            <span
                                                onClick={() => this.toggleMode('register')}
                                                style={{
                                                    color: '#4CAF50',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                Regístrate
                                            </span>
                                        </span>
                                    </div>
                                )}

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        margin: '20px 0',
                                        width: '100%',
                                    }}
                                >
                                    <div
                                        style={{
                                            flex: 1,
                                            height: '1px',
                                            backgroundColor: '#ddd',
                                        }}
                                    ></div>
                                    <span
                                        style={{
                                            margin: '0 10px',
                                            fontSize: '14px',
                                            color: '#888',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        OR
                                    </span>
                                    <div
                                        style={{
                                            flex: 1,
                                            height: '1px',
                                            backgroundColor: '#ddd',
                                        }}
                                    ></div>
                                </div>

                                <div style={{ marginTop: 20, width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    {/* Replace old GoogleLogin with the new one */}
                                    <GoogleLogin
                                        onSuccess={this.handleGoogleLoginSuccess}
                                        onError={this.handleGoogleLoginError}
                                        useOneTap // Optional: Enables One Tap sign-in prompt
                                        disabled={this.state.isSubmitting}
                                    />
                                </div>
                            </>
                        )}

                    </div>
                    <Snackbar
                        open={this.state.snackbarOpen}
                        autoHideDuration={3000}
                        onClose={() => this.setState({ snackbarOpen: false })}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    >
                        <Alert
                            onClose={() => this.setState({ snackbarOpen: false })}
                            severity={this.state.snackbarSeverity}
                        >
                            {this.state.snackbarMessage}
                        </Alert>
                    </Snackbar>
                </Dialog>
            </MuiThemeProvider>
        );
        
    }
}

export default Register;