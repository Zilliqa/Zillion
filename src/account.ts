/**
 * Modified for Zilliqa
 * Reference from https://github.com/zillet/zillet/blob/master/app/plugins/zillet.js
 */
import { NetworkURL, OperationStatus, AccessMethod, Constants } from './util/enum';
import ZilliqaLedger from './ledger';

import TransportU2F from "@ledgerhq/hw-transport-u2f";
import TransportWebAuthn from "@ledgerhq/hw-transport-webauthn";

import { HTTPProvider } from '@zilliqa-js/core';
import { fromBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';
import BN from 'bn.js';
import { getRandomAPI } from './util/random-api';
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const { Network } = require('@zilliqa-js/blockchain');
const { TransactionFactory } = require('@zilliqa-js/account');
const { Blockchain } = require('@zilliqa-js/blockchain');
const { Contracts } = require('@zilliqa-js/contract');
const { bytes } = require('@zilliqa-js/util');

const bip39 = require('bip39');
const hdkey = require('hdkey');

let CHAIN_ID = 1;
let MSG_VERSION = 1;
let GAS_PRICE = Constants.DEFAULT_GAS_PRICE; // 1000000000 Qa

const GAS_LIMIT = Constants.DEFAULT_GAS_LIMIT;
const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');

 // config.js from public folder
 // max retry attempt: 10 tries
 // retry delay interval: 100ms
 let { api_max_retry_attempt, api_retry_delay } = (window as { [key: string]: any })['config'];
 api_max_retry_attempt = api_max_retry_attempt ? api_max_retry_attempt : 10;
 api_retry_delay = api_retry_delay ? api_retry_delay : 100;

Zilliqa.prototype.setProvider = function(provider: any) {
    this.blockchain.provider = provider;
    this.wallet.provider = this.blockchain.provider;
    this.blockchain = new Blockchain(this.wallet.provider, this.wallet);
    this.network = new Network(this.wallet.provider, this.wallet);
    this.contracts = new Contracts(this.wallet.provider, this.wallet);
    this.transactions = new TransactionFactory(this.wallet.provider, this.wallet);
};

Zilliqa.prototype.clearAccount = function() {
    this.wallet.accounts = {};
    this.wallet.defaultAccount = undefined;
};

export const cleanUp = function() {
    console.log("clean up wallet");
    zilliqa.wallet.accounts = {};
    zilliqa.wallet.defaultAccount = undefined;
}

export const changeNetwork = function(networkURL: string) {
    zilliqa.setProvider(new HTTPProvider(networkURL));
    console.log("network changed: %o", networkURL);
    
    // set to correct chain id for contract calls
    switch (networkURL) {
        case NetworkURL.TESTNET: {
            CHAIN_ID = 333;
            break;
        }
        case NetworkURL.MAINNET: {
            CHAIN_ID = 1;
            break;
        }
        case NetworkURL.ISOLATED_SERVER: {
            CHAIN_ID = 222;
            break;
        }
        default: {
            // default to testnet
            CHAIN_ID = 333;
            break;
        }
    }

    // set to correct min gas price
    setMinimumGasPrice();
}

export const addWalletByKeystore = async (keystore: string, passphrase: string) => {
    try {
        const address = await zilliqa.wallet.addByKeystore(keystore, passphrase);
        return address;
    } catch (err) {
        console.error("error: addWalletByKeystore - %o", err);
        return "error";
    }
};

// not in used
export const addWalletByMnemonic = async (mnemonicPhrase: string, index: number, passphrase?: string) => {
    if (index === 1) {
        try {
            const seed = await bip39.mnemonicToSeedSync(mnemonicPhrase, passphrase);
            const hdKey = hdkey.fromMasterSeed(seed);
            const childKey = hdKey.derive(`m/44'/313'/0'/0/0`);
            const privateKey = childKey.privateKey.toString('hex');
            return await addWalletByPrivatekey(privateKey);
        } catch (err) {
            console.error("error: addWalletByMnemonic password based - %o", err);
            return "error";
        }
    } else {
        console.log("addWalletBuMnemonic default");
        // default to zero index
        // no passphrase
        try {
            const address = await zilliqa.wallet.addByMnemonic(mnemonicPhrase);
            return address;
        } catch (err) {
            console.error("error: addWalletByMnemonic default - %o", err);
            return "error";
        }
    }
};

// not in used
export const addWalletByPrivatekey = async (privatekey: string) => {
    try {
        const address = await zilliqa.wallet.addByPrivateKey(privatekey);
        return address;
    } catch (err) {
        console.error("error: addWalletByPrivatekey - %o", err);
        return "error";
    }
};

// used by wallet ledger
export const getBalance = async (address: string) => {
    try {
        const balance = await zilliqa.blockchain.getBalance(address);
        if (balance.result.balance === undefined) {
            console.error("error: getBalance undefined error");
            return "0";
        }
        return balance.result.balance;
    } catch (err) {
        console.error("error: getBalance - o%", err);
        return "0";
    }
};

// identical to getBalance except it uses a random API
export const getBalanceWithNetwork = async (address: string, networkURL: string) => {
    try {
        const randomAPI = getRandomAPI(networkURL);
        const zilliqaObj = new Zilliqa(randomAPI);
        const balance = await zilliqaObj.blockchain.getBalance(address);
        if (balance.result.balance === undefined) {
            console.error("error: getBalance undefined error");
            return "0";
        }
        return balance.result.balance;
    } catch (err) {
        // console.error("error: getBalance - o%", err);
        return "0";
    }
}

export const getNonce = async (address: string) => {
    try {
        const balance = await zilliqa.blockchain.getBalance(address);
        if (balance.error && balance.error.code === -5) {
            console.error("account has not balance.");
            return -1;
        }
        return parseInt(balance.result.nonce) + 1;
    } catch (err) {
        console.error("error: getNonce - o%", err);
        return -1;
    }
}


// -------------------------------
//           RETRIABLE
// -------------------------------

export const getImplStateExplorerRetriable = async (implAddr: string, networkURL: string, state: string, indices?: any) => {
    let result;

    for (let attempt = 0; attempt < api_max_retry_attempt; attempt++) {
        result = await getImplStateExplorer(implAddr, networkURL, state, indices);
        if (result !== "error") {
            break;
        } else {
            await new Promise(resolve => setTimeout(resolve, api_retry_delay));
        }
    }
    return result;
};

export const getNumTxBlocksExplorerRetriable = async (networkURL: string) => {
    let result;

    for (let attempt = 0; attempt < api_max_retry_attempt; attempt++) {
        result = await getNumTxBlocksExplorer(networkURL);
        if (result !== OperationStatus.ERROR) {
            break;
        } else {
            await new Promise(resolve => setTimeout(resolve, api_retry_delay));
        }
    }
    return result;
};

export const getTotalCoinSupplyWithNetworkRetriable = async (networkURL:string) => {
    let result;
    for (let attempt = 0; attempt < api_max_retry_attempt; attempt++) {
        result = await getTotalCoinSupplyWithNetwork(networkURL);
        if (result !== OperationStatus.ERROR) {
            break;
        } else {
            await new Promise(resolve => setTimeout(resolve, api_retry_delay));
        }
    }
    return result;
};

/**
 * getImplStateExplorer
 * 
 * Get smart contract sub state with a new zilliqa object
 * sets the network but doesn't affect the rest of the zilliqa calls such as sending transaction
 * which depends on the main zilliqa object
 * 
 * Initially for explorer page, now extended to home page and other places that requires a random API
 * to lessen load on Zilliqa API
 * 
 * @param implAddr    implementation contract in checksum format
 * @param networkURL  blockchain api URL
 * @param state       the name of the variable in the contract
 * @param indices     JSON array to specify the indices if the variable is a map type
 */
export const getImplStateExplorer = async (implAddr: string, networkURL: string, state: string, indices?: any) => {
    if (!implAddr) {
        console.error("error: getImplStateExplorer - no implementation contract found");
        return "error";
    }

    try {
        const randomAPI = getRandomAPI(networkURL);
        const explorerZilliqa = new Zilliqa(randomAPI);

        let contractState: any = null;
        if (indices !== null) {
            // fetched implementation contract address
            contractState = await explorerZilliqa.blockchain.getSmartContractSubState(implAddr, state, indices);
        } else {
            contractState = await explorerZilliqa.blockchain.getSmartContractSubState(implAddr, state);
        }
        
        if (!contractState.hasOwnProperty("result") || contractState.result === null || contractState.result === undefined) {
            return "error";
        }

        return contractState.result;

    } catch (err) {
        // console.error("error: getImplStateExplorer - o%", err);
        return "error";
    }
};


/**
 * getNumTxBlocksExplorer
 * 
 * Retrieves the latest block number with a new zilliqa object
 * sets the network but doesn't affect the rest of the zilliqa calls such as sending transaction
 * which depends on the main zilliqa object
 * @param networkURL 
 * @returns 
 */
export const getNumTxBlocksExplorer = async (networkURL: string) => {
    try {
        const randomAPI = getRandomAPI(networkURL);
        const explorerZilliqa = new Zilliqa(randomAPI);
        const info = await explorerZilliqa.blockchain.getBlockChainInfo();
        if (info === undefined && info.result === undefined) {
            return OperationStatus.ERROR;
        }
        return info.result.NumTxBlocks;
    } catch (err) {
        // console.error("error - get latest blk number explorer: %o", err);
        return OperationStatus.ERROR;
    }
}

/**
 * getTotalCoinSupplyWithNetwork
 * 
 * Retrieves the latest total $ZIL supply
 * @param networkURL 
 * @returns 
 */
export const getTotalCoinSupplyWithNetwork = async (networkURL: string) => {
    try {
        const randomAPI = getRandomAPI(networkURL);
        const zilliqaObj = new Zilliqa(randomAPI);
        const totalCoinSupply = await zilliqaObj.blockchain.getTotalCoinSupply();
        return totalCoinSupply;
    } catch (err) {
        // console.error("error: getTotalCoinSupply - o%", err);
        return OperationStatus.ERROR;
    }
}


/**
 * isOperator
 * 
 * Checks if the logged-in user is a legit node operator
 * 
 * @param impl implementation contract address
 * @param address base16 address
 * @param networkURL 
 * @returns 
 */
export const isOperator = async (impl: string, address: string, networkURL: string) => {
    if (!impl || !networkURL) {
        return false;
    }

    const contractState = await getImplStateExplorerRetriable(impl, networkURL, "ssnlist", [address]);

    if (contractState === undefined || contractState === "error") {
        return false;
    }

    console.log("account.ts check is operator: %o", address);
    console.log("account.ts check is impl: %o", impl);
    console.log("account.ts check is networkURL: %o", networkURL);
    return true;
};


/**
 * getGasFees
 * 
 * Returns the combined gas price and gas limit in Qa
 * assume gas price has been retrieved correctly when dashboard is loaded
 * @returns
 */
export const getGasFees = () => {
    // gas limit * gas price
    const gasFees = new BN(GAS_LIMIT).mul(new BN(GAS_PRICE));
    return gasFees;
}

export const ZilliqaAccount = () => {
    return zilliqa;
};

// sign wrapper to determine which signer to use
export const handleSign = async (accessMethod: string, networkURL: string, txParams: any, ledgerIndex: number) => {
    changeNetwork(networkURL);
    let result = "";
    switch (accessMethod) {
        case AccessMethod.LEDGER:
            result = await handleLedgerSign(networkURL, txParams, ledgerIndex);
            break;
        case AccessMethod.PRIVATEKEY:
            result = await handleNormalSign(txParams);
            break;
        case AccessMethod.MNEMONIC:
            result = await handleNormalSign(txParams);
            break;
        case AccessMethod.KEYSTORE:
            result = await handleNormalSign(txParams);
            break;
        case AccessMethod.ZILPAY:
            result = await handleZilPaySign(txParams);
            break;
        default:
            console.error("error: no such account type :%o", accessMethod);
            result = OperationStatus.ERROR;
            break;
    }
    return result;
};

const handleLedgerSign = async (networkURL: string, txParams: any, ledgerIndex: number) => {
    let transport = null;
    const isWebAuthn = await TransportWebAuthn.isSupported();
    if (isWebAuthn) {
        console.log("webauthn is supported");
        transport = await TransportWebAuthn.create();
    } else {
        transport = await TransportU2F.create();
    }
    
    const ledger = new ZilliqaLedger(transport);
    const result = await ledger.getPublicAddress(ledgerIndex);

    // get public key
    let pubKey = result.pubKey;

    // get user base 16 address
    let userWalletAddress = result.pubAddr;
    if (validation.isBech32(userWalletAddress)) {
        userWalletAddress = fromBech32Address(userWalletAddress);
    }

    console.log("pubKey: %o", pubKey);
    console.log("pubAddr: %o", userWalletAddress);

    // get nonce
    let nonce = await getNonce(userWalletAddress);

    // toAddr: proxy checksum contract address
    try {
        const newParams = {
            version: bytes.pack(CHAIN_ID, MSG_VERSION),
            toAddr: txParams.toAddr,
            amount: txParams.amount.toString(),
            code: txParams.code,
            data: txParams.data,
            gasLimit: GAS_LIMIT.toString(),
            gasPrice: GAS_PRICE.toString(),
            nonce: nonce,
            pubKey: pubKey,
            signature: "",
        };
        console.log("new params :%o", newParams);
        const signature = await ledger.signTxn(ledgerIndex, newParams);
        const signedTx = {
            ...newParams,
            amount: txParams.amount.toString(),
            gasPrice: GAS_PRICE.toString(),
            gasLimit: GAS_LIMIT.toString(),
            signature
        };
        console.log(signedTx);

        // send the signed transaction
        try {
            const newTx = {
                id: "1",
                jsonrpc: "2.0",
                method: "CreateTransaction",
                params: [
                    {
                        toAddr: txParams.toAddr,
                        amount: txParams.amount.toString(),
                        code: txParams.code,
                        data: txParams.data,
                        gasPrice: GAS_PRICE.toString(),
                        gasLimit: GAS_LIMIT.toString(),
                        nonce: nonce,
                        pubKey: pubKey,
                        signature: signature,
                        version: bytes.pack(CHAIN_ID, MSG_VERSION),
                        priority: true
                    }
                ]
            };

            const response = await fetch(networkURL, {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newTx)
            });

            let data = await response.json();
            if (data.result.TranID !== undefined) {
                console.log("ledger sent txn! - txnid: %o", data.result.TranID);
                return data.result.TranID;
            }

            if (data.error !== undefined) {
                console.error(data.error);
                return OperationStatus.ERROR;
            }

            if (data.result.error !== undefined) {
                console.error(data.result.error);
                return OperationStatus.ERROR;
            }

            transport.close();

        } catch (err) {
            console.log("something is wrong with broadcasting the transaction :%o", JSON.stringify(err));
            return OperationStatus.ERROR;
        }

    } catch (err) {
        console.error("error - ledger signing: %o", err);
        return OperationStatus.ERROR;
    }
}

const handleNormalSign = async (txParams: any) => {
    // convert to zilliqa transaction object
    // toAddr: proxy checksum contract address
    const zilliqaTxn = zilliqa.transactions.new(
        {
            toAddr: txParams.toAddr,
            amount: txParams.amount,
            data: txParams.data,
            gasPrice: new BN(GAS_PRICE),
            gasLimit: GAS_LIMIT,
            version: bytes.pack(CHAIN_ID, MSG_VERSION),
        },
        true
    );
    console.log(zilliqaTxn);
    try {
        const txn = await zilliqa.blockchain.createTransaction(zilliqaTxn);
        return txn.id;
    } catch (err) {
        console.error("error handleNormalSign - something is wrong with broadcasting the transaction: ");
        console.error(err);
        return OperationStatus.ERROR;
    }
}

const handleZilPaySign = async (txParams: any) => {
    // convert to zilliqa transaction object
    // toAddr: proxy checksum contract address
    const zilPay = (window as any).zilPay;
    const zilliqaTxn = zilliqa.transactions.new(
        {
            toAddr: txParams.toAddr,
            amount: txParams.amount,
            data: txParams.data,
            gasPrice: GAS_PRICE,
            gasLimit: GAS_LIMIT,
            version: bytes.pack(CHAIN_ID, MSG_VERSION),
        },
        true
    );

    console.log(zilliqaTxn);
    
    try {
        const txn = await zilPay.blockchain.createTransaction(zilliqaTxn);
        return txn.ID;
    } catch (err) {
        console.error("error handleNormalSign - something is wrong with broadcasting the transaction: %o", JSON.stringify(err));
        return OperationStatus.ERROR;
    }
}

// retrieve and set the minimum gas price for current selected network
const setMinimumGasPrice = async () => {
    // assume network has been set
    const minimumGasPrice = await zilliqa.blockchain.getMinimumGasPrice();

    if (minimumGasPrice.result === undefined) {
        // something is wrong with the api
        GAS_PRICE = Constants.DEFAULT_GAS_PRICE;
    } else {
        console.log("min gas price from api: %o", minimumGasPrice.result);
        GAS_PRICE = minimumGasPrice.result;
    }

    return GAS_PRICE;
}