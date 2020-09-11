import React, { useState } from "react";
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';

import * as ZilliqaAccount from '../account';
import { Role, LedgerIndex, Network } from '../util/enum';

const AppContext = React.createContext({
    accountType: '',
    address: '',
    ledgerIndex: LedgerIndex.DEFAULT,
    network: '',
    isAuth: false,
    role: '',
    cleanUp: () => {},
    setWallet: (inputAddr: string) => {},
    initParams: (inputAddress: string, selectedRole: string, selectedAccountType: string) => {},
    updateAuth: () => {},
    updateLedgerIndex: (index: number) => {},
    updateNetwork: (selectedNetwork: string) => {},
    updateRole: (inputAddress: string, selectedRole: string) => {},
});

function AppProvider(props: any) {
    // bech32 address
    const [address, setAddress] = useState('');
    const [accountType, setAccountType] = useState('');
    const [network, setNetwork] = useState(Network.TESTNET as string); // testnet, mainnet, or isolated server
    const [publicKey, setPublicKey] = useState('');
    const [ledgerIndex, setLedgerIndex] = useState(LedgerIndex.DEFAULT);
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
        setLedgerIndex(LedgerIndex.DEFAULT);
        setAuth(false);
    };

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

    const updateLedgerIndex = (index: number) => {
        setLedgerIndex(index);
    }

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
        <AppContext.Provider value={{ accountType, address, ledgerIndex, network, isAuth, role, cleanUp, setWallet, initParams, updateAuth, updateLedgerIndex, updateNetwork, updateRole }}>
            {props.children}
        </AppContext.Provider>
    );
}

export default AppContext;

export { AppProvider }