/**
 * Modified for StakeZ
 * Reference from https://github.com/zillet/zillet/blob/master/app/plugins/zillet.js
 */
import { NetworkURL, OperationStatus, AccessMethod } from './util/enum';
import ZilliqaLedger from './ledger';

import TransportU2F from "@ledgerhq/hw-transport-u2f";
import TransportWebAuthn from "@ledgerhq/hw-transport-webauthn";

import { HTTPProvider } from '@zilliqa-js/core';
import { fromBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const { Network } = require('@zilliqa-js/blockchain');
const { TransactionFactory } = require('@zilliqa-js/account');
const { Blockchain } = require('@zilliqa-js/blockchain');
const { Contracts } = require('@zilliqa-js/contract');
const { units, bytes } = require('@zilliqa-js/util');

const bip39 = require('bip39');
const hdkey = require('hdkey');

let CHAIN_ID = 1;
let MSG_VERSION = 1;

const GAS_PRICE = units.toQa('1000', units.Units.Li);
const GAS_LIMIT = 25000;
const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');

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
            CHAIN_ID = 1;
            break;
        }
        default: {
            // default to testnet
            CHAIN_ID = 333;
            break;
        }
    }
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

export const addWalletByPrivatekey = async (privatekey: string) => {
    try {
        const address = await zilliqa.wallet.addByPrivateKey(privatekey);
        return address;
    } catch (err) {
        console.error("error: addWalletByPrivatekey - %o", err);
        return "error";
    }
};

export const getBalance = async (address: string) => {
    try {
        const balance = await zilliqa.blockchain.getBalance(address);
        if (balance.result.balance === undefined) {
            console.error("error: getBalance undefined error");
            return "0";
        }
        console.log(balance.result);
        return balance.result.balance;
    } catch (err) {
        console.error("error: getBalance - o%", err);
        return "0";
    }
};

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

// getSsnImplContract - get implementation contract state from the proxy contract
export const getSsnImplContract = async (proxyAddr: string, networkURL?: string) => {
    if (networkURL) {
        changeNetwork(networkURL);
    }
    try {
        if (!proxyAddr) {
            console.error("error: getSsnImplContract - no proxy contract found");
            return "error";
        }

        const proxyContract = await zilliqa.blockchain.getSmartContractState(proxyAddr);
        console.log("fetched proxy contract state");
        
        if (proxyContract.result.hasOwnProperty('implementation')) {
            // fetched implementation contract address
            const implContract = await zilliqa.blockchain.getSmartContractState(proxyContract.result.implementation);
            console.log("fetched implementation contract state");
            return implContract.result;

        } else {
            console.error("error: getSsnImplContract - no implementation contract found");
            return "error"
        }

    } catch (err) {
        console.error("error: getSsnImplContract - o%", err);
        return "error"
    }
};

// isOperator - check if address is node operator
// @param address: base16 address
export const isOperator = async (proxy: string, address: string, networkURL: string) => {
    if (!proxy || !networkURL) {
        return false;
    }

    const contract = await getSsnImplContract(proxy, networkURL);
    if (contract === undefined || contract === "error") {
        return false;
    }
    console.log("account.ts check is operator: %o", address);
    console.log("account.ts check is proxy: %o", proxy);
    console.log("account.ts check is networkURL: %o", networkURL);
    if (contract.hasOwnProperty('ssnlist') && contract.ssnlist.hasOwnProperty(address)) {
        console.log("operator %o exist", address);
        return true;
    } else {
        return false;
    }
};


export const ZilliqaAccount = () => {
    return zilliqa;
};

// refactor
export const handleSign = async (accessMethod: string, networkURL: string, txParams: any) => {
    changeNetwork(networkURL);
    let result = "";
    switch (accessMethod) {
        case AccessMethod.LEDGER:
            result = await handleLedgerSign(networkURL, txParams);
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

const handleLedgerSign = async (networkURL: string, txParams: any) => {
    let transport = null;
    const isWebAuthn = await TransportWebAuthn.isSupported();
    if (isWebAuthn) {
        console.log("webauthn is supported");
        transport = await TransportWebAuthn.create();
    } else {
        transport = await TransportU2F.create();
    }
    
    const ledger = new ZilliqaLedger(transport);
    const result = await ledger.getPublicAddress(0);

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
        const signature = await ledger.signTxn(0, newParams);
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
            gasPrice: GAS_PRICE,
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
        console.error("error handleNormalSign - something is wrong with broadcasting the transaction: %o", JSON.stringify(err));
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