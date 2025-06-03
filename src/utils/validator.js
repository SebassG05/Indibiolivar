// Validar que el email sea válido
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email address.';
    }
    return null; 
};

// Validar que la contraseña tenga más de 6 caracteres y al menos un carácter especial
export const validatePassword = (password) => {
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/; 
    if (password.length < 6) {
        return 'Password must be at least 6 characters long.';
    }
    if (!specialCharRegex.test(password)) {
        return 'Password must contain at least one special character.';
    }
    return null; 
};