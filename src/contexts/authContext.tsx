import React, { useState } from 'react';
// const { Zilliqa } = require("@zilliqa-js/zilliqa");

// Consumer
// list of react context to share with other components
// add objects which we want to track globally here
export const AuthContext = React.createContext(
    {
        isAuthenticated: false,
        address: '',
        toggleAuthentication: (address: string) => {},
    }
);

// Provider
// track the objects via states
function AuthProvider(props: any) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [address, setAddress] = useState('');

    const toggleAuthentication = (address: string) => {
        setAddress(address);
        setIsAuthenticated(true);
    };

    // props.children allows the browser to render the switch routes in app.tsx
    return (
        <AuthContext.Provider value={{isAuthenticated, address, toggleAuthentication}}>
            {props.children}
        </AuthContext.Provider>
    );
}

export {
    AuthProvider
};