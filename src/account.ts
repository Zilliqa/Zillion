/**
 * Modified for StakeZ
 * Reference from https://github.com/zillet/zillet/blob/master/app/plugins/zillet.js
 */
import { Network as NetworkOptions, OperationStatus, AccessMethod } from './util/enum';
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
const { BN, units, bytes, Long } = require('@zilliqa-js/util');

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

export const changeNetwork = function(networkURL: string) {
    zilliqa.setProvider(new HTTPProvider(networkURL));
    console.log("network changed: %o", networkURL);
    
    // set to correct chain id for contract calls
    switch (networkURL) {
        case NetworkOptions.TESTNET: {
            CHAIN_ID = 333;
            break;
        }
        case NetworkOptions.MAINNET: {
            CHAIN_ID = 1;
            break;
        }
        case NetworkOptions.ISOLATED_SERVER: {
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
        const proxyContract = await zilliqa.blockchain.getSmartContractState(proxyAddr);
        console.log("fetched proxy contract state");
        const implContract = await zilliqa.blockchain.getSmartContractState(proxyContract.result.implementation);
        console.log("fetched implementation contract state");
        return implContract.result;
    } catch (err) {
        console.error("error: getSsnImplContract - o%", err);
        return "error"
    }
};

// isOperator - check if address is node operator
// @param address: base16 address
export const isOperator = async (proxy: string, address: string, networkURL: string) => {
    const contract = await getSsnImplContract(proxy, networkURL);
    if (contract === "error") {
        return false;
    }
    console.log("account.ts check is operator: %o", address);
    console.log("account.ts check is proxy: %o", proxy);
    console.log("account.ts check is networkURL: %o", networkURL);
    if (contract.ssnlist && contract.ssnlist.hasOwnProperty(address)) {
        console.log("operator %o exist", address);
        return true;
    } else {
        return false;
    }
};

// withdrawComm - withdraw commission
// @ssn operator
// @param proxy: contract address of the ssn proxy
// @return a json with the transaction id and a success boolean
export const withdrawComm = async (proxy: string) => {
    try {
        const contract = zilliqa.contracts.at(proxy);
        const txn = await contract.call(
            'WithdrawComm',
            [],
            {
                version: bytes.pack(CHAIN_ID, MSG_VERSION),
                amount: new BN(0),
                gasPrice: GAS_PRICE,
                gasLimit: Long.fromNumber(GAS_LIMIT)
            },
            33,
            1000,
            true
        );
        console.log("transaction: %o", txn.id);
        console.log(JSON.stringify(txn.receipt, null, 4));
        let result = {
            txn_id: txn.id,
            success: txn.receipt.success
        }
        return JSON.stringify(result);
    } catch (err) {
        console.error("error: withdrawComm: %o", err);
        return OperationStatus.ERROR;
    }
};

// updateCommissionRate - update the commission rate of a ssn
// @ssn operator
// @param proxy:   contract address of the ssn proxy
// @param newRate: the new commission rate 
// @return a json with the transaction id and a success boolean
export const updateCommissionRate = async (proxy: string, newRate: string) => {
    console.log("update commission rate - new_rate %o", newRate);
    try {
        const contract = zilliqa.contracts.at(proxy);
        const txn = await contract.call(
            'UpdateComm',
            [
                {
                    vname: 'new_rate',
                    type: 'Uint128',
                    value: newRate
                }
            ],
            {
                version: bytes.pack(CHAIN_ID, MSG_VERSION),
                amount: new BN(0),
                gasPrice: GAS_PRICE,
                gasLimit: Long.fromNumber(GAS_LIMIT)
            },
            33,
            1000,
            true
        );
        console.log("transaction: %o", txn.id);
        console.log(JSON.stringify(txn.receipt, null, 4));
        let result = {
            txn_id: txn.id,
            success: txn.receipt.success
        }
        return JSON.stringify(result);
    } catch (err) {
        console.error("error: updateCommissionRate: %o", err);
        return OperationStatus.ERROR;
    }
}

// updateReceiverAddress - update the address which would received the commission
// @ssn operator
// @param proxy:   contract address of the ssn proxy
// @param address: receiver address
// @return a json with the transaction id and a success boolean
export const updateReceiverAddress = async (proxy: string, address: string) => {
    // check address format and convert to ByStr20
    if (validation.isBech32(address)) {
        address = fromBech32Address(address);
    } else if (!validation.isAddress(address)) {
        return OperationStatus.ERROR
    }

    console.log("updateReceiverAddress - new_addr: %o", address);
    try {
        const contract = zilliqa.contracts.at(proxy);
        const txn = await contract.call(
            'UpdateReceivedAddr',
            [
                {
                    vname: 'new_addr',
                    type: 'ByStr20',
                    value: address
                }
            ],
            {
                version: bytes.pack(CHAIN_ID, MSG_VERSION),
                amount: new BN(0),
                gasPrice: GAS_PRICE,
                gasLimit: Long.fromNumber(GAS_LIMIT)
            },
            33,
            1000,
            true
        );
        console.log("transaction: %o", txn.id);
        console.log(JSON.stringify(txn.receipt, null, 4));
        let result = {
            txn_id: txn.id,
            success: txn.receipt.success
        }
        return JSON.stringify(result);
    } catch (err) {
        console.error("error: updateReceiverAddress: %o", err);
        return OperationStatus.ERROR;
    }
};

export const ZilliqaAccount = () => {
    return zilliqa;
};

// refactor
export const handleSign = async (accessMethod: string, networkURL: string, txParams: any) => {
    switch (accessMethod) {
        case AccessMethod.LEDGER:
            handleLedgerSign(networkURL, txParams);
            break;
        case AccessMethod.PRIVATEKEY:
            handleNormalSign(txParams);
            break;
        case AccessMethod.MNEMONIC:
            handleNormalSign(txParams);
            break;
        case AccessMethod.KEYSTORE:
            handleNormalSign(txParams);
            break;
        default:
            console.error("error: no such account type :%o", accessMethod);
    }
};

const handleLedgerSign = async (networkURL: string, txParams: any) => {
    changeNetwork(networkURL);

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

    // get recipient base16 address
    let recipient = result.pubAddr;
    if (validation.isBech32(recipient)) {
        recipient = fromBech32Address(recipient);
    }

    console.log("pubKey: %o", pubKey);
    console.log("pubAddr: %o", recipient);

    // get nonce
    let nonce = await getNonce(recipient);

    try {
        const newParams = {
            toAddr: recipient,
            amount: txParams.amount.toString(),
            code: txParams.code,
            data: txParams.data,
            gasPrice: txParams.gasPrice.toString(),
            gasLimit: txParams.gasLimit.toString(),
            nonce: nonce,
            pubKey: pubKey,
            signature: '',
            version: bytes.pack(CHAIN_ID, MSG_VERSION),
        };
        const signature = await ledger.signTxn(0, newParams);
        const signedTx = {
            ...newParams,
            amount: txParams.amount.toString(),
            gasPrice: txParams.gasPrice.toString(),
            gasLimit: txParams.gasLimit.toString(),
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
                        toAddr: recipient,
                        amount: txParams.amount.toString(),
                        code: txParams.code,
                        data: txParams.data,
                        gasPrice: txParams.gasPrice.toString(),
                        gasLimit: txParams.gasLimit.toString(),
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

const handleNormalSign = (txParams: any) => {

}