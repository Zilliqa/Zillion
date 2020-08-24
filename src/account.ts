/**
 * Modified for StakeZ
 * Reference from https://github.com/zillet/zillet/blob/master/app/plugins/zillet.js
 */
import { HTTPProvider } from '@zilliqa-js/core';
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const { Network } = require('@zilliqa-js/blockchain');
const { TransactionFactory } = require('@zilliqa-js/account');
const { Blockchain } = require('@zilliqa-js/blockchain');
const { Contracts } = require('@zilliqa-js/contract');

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

// get implementation contract state from the proxy contract
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

export const ZilliqaAccount = () => {
    return zilliqa;
};