/**
 * Modified for StakeZ
 * Reference from https://github.com/zillet/zillet/blob/master/app/plugins/zillet.js
 */
import { HTTPProvider } from '@zilliqa-js/core';
import { Network as NetworkOptions, OperationStatus } from './util/enum';
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const { Network } = require('@zilliqa-js/blockchain');
const { TransactionFactory } = require('@zilliqa-js/account');
const { Blockchain } = require('@zilliqa-js/blockchain');
const { Contracts } = require('@zilliqa-js/contract');
const { BN, units, bytes, Long } = require('@zilliqa-js/util');

let CHAIN_ID = 1;
let MSG_VERSION = 1;

const GAS_PRICE = units.toQa('1000', units.Units.Li);
const GAS_LIMIT = 10000;
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

export const addWalletByMnemonic = async (phrase: string) => {
    try {
        // TODO
        // default to index 0
        // add support for password and ledger mnemonic
        const address = await zilliqa.wallet.addByMnemonic(phrase);
        return address;
    } catch (err) {
        console.error("error: addWalletByMnemonic - %o", err);
        return "error";
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

// getSsnImplContract - get implementation contract state from the proxy contract
export const getSsnImplContract = async (proxyAddr: string) => {
    try {
        const proxyContract = await zilliqa.blockchain.getSmartContractState(proxyAddr);
        console.log("get proxy contract state: %o", proxyContract.result);
        const implContract = await zilliqa.blockchain.getSmartContractState(proxyContract.result.implementation);
        console.log("get implementation contract state: %o", implContract.result);
        return implContract.result;
    } catch (err) {
        console.error("error: getSsnImplContract - o%", err);
        return "error"
    }
};

// withdrawComm - withdraw commission (ssn operator)
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

export const ZilliqaAccount = () => {
    return zilliqa;
};