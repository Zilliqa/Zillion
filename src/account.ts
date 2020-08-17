/**
 * Modified for StakeZ
 * Reference from https://github.com/zillet/zillet/blob/master/app/plugins/zillet.js
 */
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

export const ZilliqaAccount = () => {
    return zilliqa;
};