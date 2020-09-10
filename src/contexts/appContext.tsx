import React, { useState } from "react";
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';

import * as ZilliqaAccount from '../account';
import { Role, Network } from '../util/enum';

const AppContext = React.createContext({
    accountType: '',
    address: '',
    network: '',
    isAuth: false,
    role: '',
    cleanUp: () => {},
    setWallet: (inputAddr: string) => {},
    initParams: (inputAddress: string, selectedRole: string, selectedAccountType: string) => {},
    updateAuth: () => {},
    updateNetwork: (selectedNetwork: string) => {},
    updateRole: (inputAddress: string, selectedRole: string) => {},
});

function AppProvider(props: any) {
    // bech32 address
    const [address, setAddress] = useState('');
    const [accountType, setAccountType] = useState('');
    const [network, setNetwork] = useState(Network.TESTNET as string); // testnet, mainnet, or isolated server
    const [publicKey, setPublicKey] = useState('');
    const [role, setRole] = useState('');
    const [isAuth, setAuth] = useState(false);

    // config.js from public folder
    const { networks_config } = (window as { [key: string]: any })['config'];

    const cleanUp = () => {
        setAddress('');
        setAccountType('')
        setNetwork(Network.TESTNET);
        setPublicKey('');
        setRole('');
        setAuth(false);
    };

    const setWallet = (inputAddr: string) => {
        setAddress(inputAddr);
    };

    const updateRole = async (inputAddress: string, selectedRole: string) => {
        console.log("update role");
        let walletAddress = inputAddress;
        if (validation.isBech32(walletAddress)) {
            walletAddress = fromBech32Address(walletAddress).toLowerCase();
        } else {
            walletAddress = walletAddress.toLowerCase();
        }

        if (selectedRole === Role.OPERATOR) {
            const isOperator = await ZilliqaAccount.isOperator(networks_config[network].proxy, walletAddress, networks_config[network].blockchain);
            if (!isOperator) {
                console.error("user is not operator");
                setRole(Role.DELEGATOR);
            }
        }
    }

    const updateAuth = () => {
        setAuth(!isAuth);
    };

    const updateNetwork = (selectedNetwork: string) => {
        setNetwork(selectedNetwork);
    }

    const initParams = (inputAddress: string, selectedRole: string, selectedAccountType: string) => {
        let walletAddress = inputAddress;
        if (!validation.isBech32(walletAddress)) {
            walletAddress = toBech32Address(walletAddress);
        }

        setAddress(walletAddress);
        setRole(selectedRole);
        setAccountType(selectedAccountType);
    };

    return (
        <AppContext.Provider value={{ accountType, address, network, isAuth, role, cleanUp, setWallet, initParams, updateAuth, updateNetwork, updateRole }}>
            {props.children}
        </AppContext.Provider>
    );
}

export default AppContext;

export { AppProvider }