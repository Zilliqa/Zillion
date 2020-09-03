import React, { useState } from 'react';
import { toBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';
import { Network, AccessMethod } from '../util/enum';
// const { Zilliqa } = require("@zilliqa-js/zilliqa");

// Consumer
// list of react context to share with other components
// add objects which we want to track globally here
export const AuthContext = React.createContext(
    {
        isAuthenticated: false,
        address: '',
        network: '',
        accountType: '',
        role: '',
        toggleAuthentication: (address: string, accType: string, selectedRole: string) => {},
        isValid: () => {},
    }
);

// Provider
// track the objects via states
function AuthProvider(props: any) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accountType, setAccountType] = useState('');
    const [address, setAddress] = useState('');
    const [role, setRole] = useState('');
    const [network, setNetwork] = useState(Network.TESTNET);

    const toggleAuthentication = (address: string, accType: string, selectedRole: string) => {
        let walletAddr = address;
        if (!validation.isBech32(address)) {
            walletAddr = toBech32Address(address);
        }
        setAddress(walletAddr);
        setAccountType(accType)
        setRole(selectedRole);
        setIsAuthenticated(true);
    };

    const isValid = () => {
        switch (accountType) {
            case AccessMethod.PRIVATEKEY:
                return true;
            case AccessMethod.KEYSTORE:
                return true;
            case AccessMethod.MNEMONIC:
                return true;
            case AccessMethod.LEDGER:
                return true;
            default:
                console.error("No account type detected");
                return false;
        }
    }

    // props.children allows the browser to render the switch routes in app.tsx
    return (
        <AuthContext.Provider value={{isAuthenticated, address, network, accountType, role, toggleAuthentication, isValid}}>
            {props.children}
        </AuthContext.Provider>
    );
}

export {
    AuthProvider
};