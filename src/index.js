/* Written by Ye Liu */

import React from 'react';
import ReactDOM from 'react-dom';
import Router from '@router/router';
import * as serviceWorker from '@/serviceWorker';
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = "333024406750-iqtq85ch9drl7mola42a7192vfcm868d.apps.googleusercontent.com";

const App = () => (
    <Router />
);

// Render pages
ReactDOM.render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={googleClientId}>
            <App />
        </GoogleOAuthProvider>
    </React.StrictMode>,
    document.getElementById('root')
);

// Let the app work offline and load faster
serviceWorker.register();