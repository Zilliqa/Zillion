import React, { useState } from 'react';
import { toBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';
import { Network } from '../util/enum';
// const { Zilliqa } = require("@zilliqa-js/zilliqa");

// Consumer
// list of react context to share with other components
// add objects which we want to track globally here
export const AuthContext = React.createContext(
    {
        isAuthenticated: false,
        address: '',
        network: '',
        toggleAuthentication: (address: string) => {},
    }
);

// Provider
// track the objects via states
function AuthProvider(props: any) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [address, setAddress] = useState('');
    const [network, setNetwork] = useState(Network.TESTNET);

    const toggleAuthentication = (address: string) => {
        let walletAddr = address;
        if (!validation.isBech32(address)) {
            walletAddr = toBech32Address(address);
        }
        setAddress(walletAddr);
        setIsAuthenticated(true);
    };

    // props.children allows the browser to render the switch routes in app.tsx
    return (
        <AuthContext.Provider value={{isAuthenticated, address, network, toggleAuthentication}}>
            {props.children}
        </AuthContext.Provider>
    );
}

export {
    AuthProvider
};