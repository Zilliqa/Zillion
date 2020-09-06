import React, { useState } from "react";
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';

import * as ZilliqaAccount from '../account';
import { Role } from '../util/enum';

const AppContext = React.createContext({
    address: '',
    isAuth: false,
    role: '',
    setWallet: (inputAddr: string) => {},
    initParams: (inputAddress: string, selectedRole: string) => {},
    updateAuth: () => {},
    updateRole: (inputAddress: string, selectedRole: string) => {},
});

function AppProvider(props: any) {
    const proxy = process.env.REACT_APP_PROXY ? process.env.REACT_APP_PROXY : '';
    const network = process.env.REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK ? process.env.REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK : '';
    
    // bech32 address
    const [address, setAddress] = useState('');
    const [role, setRole] = useState('');
    const [isAuth, setAuth] = useState(false);

    const setWallet = (inputAddr: string) => {
        setAddress(inputAddr);
    };

    const updateRole = async (inputAddress: string, selectedRole: string) => {
        let walletAddress = inputAddress;
        if (validation.isBech32(walletAddress)) {
            walletAddress = fromBech32Address(walletAddress).toLowerCase();
        } else {
            walletAddress = walletAddress.toLowerCase();
        }

        if (selectedRole === Role.OPERATOR) {
            const isOperator = await ZilliqaAccount.isOperator(proxy, walletAddress, network);
            if (!isOperator) {
                console.error("user is not operator");
                setRole(Role.DELEGATOR);
            }
        }
    }

    const updateAuth = () => {
        setAuth(!isAuth);
    };

    const initParams = (inputAddress: string, selectedRole: string) => {
        let walletAddress = inputAddress;
        if (!validation.isBech32(walletAddress)) {
            walletAddress = toBech32Address(walletAddress);
        }

        setAddress(walletAddress);
        setRole(selectedRole);
    };

    return (
        <AppContext.Provider value={{ address, isAuth, role, setWallet, initParams, updateAuth, updateRole }}>
            {props.children}
        </AppContext.Provider>
    );
}

export default AppContext;

export { AppProvider }