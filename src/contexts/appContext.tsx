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
    loginRole: '',
    cleanUp: () => {},
    setWallet: (inputAddr: string) => {},
    initParams: (inputAddress: string, selectedAccountType: string) => {},
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
    // eslint-disable-next-line
    const [publicKey, setPublicKey] = useState('');
    const [ledgerIndex, setLedgerIndex] = useState(LedgerIndex.DEFAULT);
    const [loginRole, setLoginRole] = useState(''); // role selected at home page; will be validated and set to the "correct" role on updateRole
    const [isAuth, setAuth] = useState(false);

    // config.js from public folder
    const { networks_config } = (window as { [key: string]: any })['config'];

    const cleanUp = () => {
        setAddress('');
        setAccountType('')
        setNetwork(Network.TESTNET);
        setPublicKey('');
        setLoginRole('');
        setLedgerIndex(LedgerIndex.DEFAULT);
        setAuth(false);
    };

    const setWallet = (inputAddr: string) => {
        setAddress(inputAddr);
    };

    // used only in wallet components
    const updateRole = async (inputAddress: string, selectedRole: string) => {
        console.log("update role - selected role: %o", selectedRole);
        let walletAddress = inputAddress;
        if (validation.isBech32(walletAddress)) {
            walletAddress = fromBech32Address(walletAddress).toLowerCase();
        } else {
            walletAddress = walletAddress.toLowerCase();
        }

        const isOperator = await ZilliqaAccount.isOperator(networks_config[network].impl, walletAddress);
        if (selectedRole === Role.OPERATOR.toString() && !isOperator) {
            console.error("user is not operator");
            setLoginRole(Role.DELEGATOR.toString());
        } else if (selectedRole === Role.OPERATOR && isOperator) {
            console.log("update role - %o", Role.OPERATOR);
            setLoginRole(Role.OPERATOR.toString());
        } else {
            console.log("update role - %o", Role.DELEGATOR);
            setLoginRole(Role.DELEGATOR.toString());
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

    const initParams = (inputAddress: string, selectedAccountType: string) => {
        let walletAddress = inputAddress;
        if (!validation.isBech32(walletAddress)) {
            walletAddress = toBech32Address(walletAddress);
        }

        setAddress(walletAddress);
        setAccountType(selectedAccountType);
    };

    return (
        <AppContext.Provider value={{ accountType, address, ledgerIndex, network, isAuth, loginRole, cleanUp, setWallet, initParams, updateAuth, updateLedgerIndex, updateNetwork, updateRole }}>
            {props.children}
        </AppContext.Provider>
    );
}

export default AppContext;

export { AppProvider }