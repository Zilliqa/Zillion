import React, { useState } from 'react';
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';

import { Network, AccessMethod, Role } from '../util/enum';
import * as ZilliqaAccount from '../account';


const PROXY = process.env.REACT_APP_PROXY ? process.env.REACT_APP_PROXY : '';
const BLOCKCHAIN_NETWORK = process.env.REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK ? process.env.REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK : '';

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
        checkRole: (role: string) => {},
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

    
    // if user selected operator
    // ensure that user is indeed operator
    // otherwise set user as delegator
    const checkRole = async (roleToCheck: string) => {
        console.log("checking role address state: %o", address);
        let base16Addr = address;
        if (validation.isBech32(base16Addr)) {
            base16Addr = fromBech32Address(base16Addr).toLowerCase();
        }

        if (roleToCheck === Role.OPERATOR) {
            console.log("checking role...address :%o", base16Addr);
            const isOperator = await ZilliqaAccount.isOperator(PROXY, base16Addr, BLOCKCHAIN_NETWORK);
            if (!isOperator) {
                console.error("checkRole: user is not operator");
                setRole(Role.DELEGATOR);
            }
        }
    };

    const toggleAuthentication = (inputAddress: string, accType: string, selectedRole: string) => {
        let walletAddr = inputAddress;
        if (!validation.isBech32(inputAddress)) {
            walletAddr = toBech32Address(inputAddress);
        }
        console.log(walletAddr);
        setAddress(walletAddr);
        setAccountType(accType)
        setRole(selectedRole);
        setIsAuthenticated(true);
        console.log("address set state is :%o", walletAddr);
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
        <AuthContext.Provider value={{isAuthenticated, address, network, accountType, role, checkRole, toggleAuthentication, isValid}}>
            {props.children}
        </AuthContext.Provider>
    );
}

export {
    AuthProvider
};