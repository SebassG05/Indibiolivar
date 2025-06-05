/* Written by Ye Liu */

import React from 'react';
import ReactDOM from 'react-dom';
import Router from '@router/router';
import * as serviceWorker from '@/serviceWorker';
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = "976539618110-9rnj67tgib8m78kvp9ghmei2js36184v.apps.googleusercontent.com";


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