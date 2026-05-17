import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('blocktex_token'));

    const login = (newToken) => {
        localStorage.setItem('blocktex_token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('blocktex_token');
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
