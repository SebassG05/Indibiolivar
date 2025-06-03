// server/controllers/authController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library'); // Import Google Auth Library

// Initialize Google Auth Client
const GOOGLE_CLIENT_ID = '333024406750-iqtq85ch9drl7mola42a7192vfcm868d.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Verify Google ID Token function
async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log("Google Token Payload:", payload);
    if (payload && payload.email_verified) {
        return {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name,
        };
    } else {
        throw new Error('Google token verification failed or email not verified.');
    }
  } catch (error) {
    console.error("Error verifying Google token:", error);
    throw new Error('Invalid Google token');
  }
}

exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    // Verificar si el correo electrónico o el nombre de usuario ya están registrados
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
        return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
        return res.status(400).json({ message: 'El nombre de usuario ya está registrado' });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear un nuevo usuario
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Usuario registrado con éxito' });
};

// Login de usuario
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;
  
    // Buscar al usuario por username sin importar mayúsculas/minúsculas
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }); // Usamos 'i' para insensibilidad a mayúsculas/minúsculas
    if (!user) {
      return res.status(400).json({ message: 'El usuario no existe' });
    }
  
    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }
  
    // Generar un token JWT
    const token = jwt.sign({ userId: user._id }, 'secret_key', { expiresIn: '1h' });
    res.status(200).json({ message: 'Inicio de sesión exitoso', token });
};

// Reset Password
exports.resetPassword = async (req, res) => {
    const { username, newPassword } = req.body; // Expect username (or email) and new password

    if (!username || !newPassword) {
        return res.status(400).json({ message: 'Username/Email and new password are required' });
    }

    try {
        // Find user by username (case-insensitive) or email
        const user = await User.findOne({
            $or: [
                { username: { $regex: new RegExp(`^${username}$`, 'i') } },
                { email: { $regex: new RegExp(`^${username}$`, 'i') } } // Allow email as well
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Encrypt the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

// Updated Google Login/Register using token verification
exports.googleLogin = async (req, res) => {
    const { token, googleId, email } = req.body; // Acepta googleId y email opcionalmente

    // --- BYPASS para desarrollo: si recibimos googleId y email, buscamos el usuario directamente ---
    if (process.env.NODE_ENV === 'development' && googleId && email) {
        let user = await User.findOne({ googleId, email });
        if (user) {
            const appToken = jwt.sign({ userId: user._id }, 'secret_key', { expiresIn: '1h' });
            return res.status(200).json({
                message: 'Google authentication successful (dev bypass)',
                token: appToken,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        }
    }

    if (!token) {
        return res.status(400).json({ message: 'Google ID token is required.' });
    }

    try {
        // Verify the token and extract user info
        const googleUserInfo = await verifyGoogleToken(token);
        const { googleId, email, name } = googleUserInfo;

        // --- User lookup/creation logic ---
        let user = await User.findOne({ googleId: googleId });

        if (!user) {
            user = await User.findOne({ email: email });

            if (user) {
                // User exists with this email, link Google ID
                user.googleId = googleId;
                if (!user.username) {
                    // Generate username if missing, handle potential collisions
                    const usernameBase = name || email.split('@')[0];
                    let finalUsername = usernameBase;
                    let counter = 1;
                    while (await User.findOne({ username: { $regex: new RegExp(`^${finalUsername}$`, 'i') } })) {
                        finalUsername = `${usernameBase}_${counter}`;
                        counter++;
                    }
                    user.username = finalUsername;
                }
                await user.save();
                console.log(`Linked Google ID ${googleId} to existing user ${email}`);
            } else {
                // User does not exist, create a new one
                console.log(`Creating new user for Google ID ${googleId} and email ${email}`);
                const usernameBase = name || email.split('@')[0];
                let finalUsername = usernameBase;
                let counter = 1;
                // Robust username collision handling
                while (await User.findOne({ username: { $regex: new RegExp(`^${finalUsername}$`, 'i') } })) {
                    finalUsername = `${usernameBase}_${counter}`;
                    counter++;
                }
                 if (finalUsername !== usernameBase) {
                     console.warn(`Username collision for ${usernameBase}, using ${finalUsername}`);
                 }

                user = new User({
                    googleId: googleId,
                    email: email,
                    username: finalUsername,
                    // No password needed
                });
                await user.save();
                console.log(`New user created with Google ID ${googleId}`);
            }
        } else {
             console.log(`User found with Google ID ${googleId}`);
        }

        // --- JWT generation for your app's session ---
        const appToken = jwt.sign({ userId: user._id }, 'secret_key', { expiresIn: '1h' }); // Use your actual secret key

        res.status(200).json({
            message: 'Google authentication successful',
            token: appToken, // Send your app's token
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Error during Google login/signup:", error);
        if (error.message === 'Invalid Google token') {
             return res.status(401).json({ message: 'Invalid Google token.' });
        }
        if (error.code === 11000) {
             return res.status(400).json({ message: 'An account conflict occurred (e.g., duplicate username/email). Please try again or contact support.' });
        }
        res.status(500).json({ message: 'Server error during Google authentication' });
    }
};

// Verifica el token JWT enviado por el frontend
exports.verifyToken = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ valid: false, message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, 'secret_key');
        // Puedes buscar el usuario si quieres devolver info extra
        return res.status(200).json({ valid: true, userId: decoded.userId });
    } catch (err) {
        return res.status(401).json({ valid: false, message: 'Invalid or expired token' });
    }
};