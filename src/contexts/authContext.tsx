import React, { useState } from 'react';

// Consumer
// list of react context to share with other components
// add objects which we want to track globally here
export const AuthContext = React.createContext(
    {
        isAuthenticated: false,
        toggleAuthentication: () => {},
    }
);

// Provider
// track the objects via states
function AuthProvider(props: any) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const toggleAuthentication = () => {
        setIsAuthenticated(true);
    };

    // props.children allows the browser to render the switch routes in app.tsx
    return (
        <AuthContext.Provider value={{isAuthenticated, toggleAuthentication, }}>
            {props.children}
        </AuthContext.Provider>
    );
}

export {
    AuthProvider
};