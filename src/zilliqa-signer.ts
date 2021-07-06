import { HTTPProvider } from "@zilliqa-js/core";
import { AccountType, Constants, NetworkURL, OperationStatus } from "./util/enum";
import { logger } from "./util/logger";

const { Zilliqa } = require('@zilliqa-js/zilliqa');
const { Network } = require('@zilliqa-js/blockchain');
const { TransactionFactory } = require('@zilliqa-js/account');
const { Blockchain } = require('@zilliqa-js/blockchain');
const { Contracts } = require('@zilliqa-js/contract');
const { bytes } = require('@zilliqa-js/util');


let zilliqa = new Zilliqa("");
let chainId = 1;
let msgVersion = 1;
let gasPrice = `${Constants.DEFAULT_GAS_PRICE}`;
let gasLimit = `${Constants.DEFAULT_GAS_LIMIT}`;

Zilliqa.prototype.setProvider = function(provider: any) {
    this.blockchain.provider = provider;
    this.wallet.provider = this.blockchain.provider;
    this.blockchain = new Blockchain(this.wallet.provider, this.wallet);
    this.network = new Network(this.wallet.provider, this.wallet);
    this.contracts = new Contracts(this.wallet.provider, this.wallet);
    this.transactions = new TransactionFactory(this.wallet.provider, this.wallet);
};

export class ZilSigner {

    /**
     * change the network properties in the zilliqa obj and adjust the gas price accordingly
     * @param networkURL api url
     */
    static changeNetwork = async (networkURL: string): Promise<void> => {
        zilliqa.setProvider(new HTTPProvider(networkURL));

        switch (networkURL) {
            case NetworkURL.MAINNET: {
                chainId = 1;
                break;
            }
            case NetworkURL.TESTNET: {
                chainId = 333;
                break;
            }
            default: {
                chainId = 333;
                break;
            }
        }
        await ZilSigner.fetchGasPrice();
    }

    /**
     * add a wallet account into the zilliqa obj via keystore
     * @param keystore      keystore json file
     * @param passphrase    passphrase to unlock the keystore json if any
     * @returns wallet address if sucessful, otherwise return error
     */
    static addWalletByKeystore = async (keystore: string, passphrase: string) => {
        try {
            const address =  await zilliqa.wallet.addByKeystore(keystore, passphrase);
            return address;
        } catch (err) {
            logger("error: add wallet by keystore - ", err);
            return OperationStatus.ERROR;
        }
    }

    /**
     * create and sign a transaction
     * @param account   type of account being connected, e.g. zilpay or ledger
     * @param txParams  txn parameters to be created and signed
     * @param ledgerIndex ledger index, if using ledger (optional)
     * @returns the transaction id, otherwise returns error
     */
    static sign = async (account: AccountType, txParams: any, ledgerIndex?: number) => {
        let result = "";
        switch (account) {
            case AccountType.LEDGER:
                // result = await ledgerSign();
                break;
            case AccountType.ZILPAY:
                result = await ZilSigner.zilPaySign(txParams);
                break;
            case AccountType.KEYSTORE:
            case AccountType.PRIVATEKEY:
            case AccountType.MNEMONIC:
                result = await ZilSigner.sdkSign(txParams);
                break;
            default:
                logger("error: no such account type - ", account);
                result = OperationStatus.ERROR;
                break;
        }
        return result;
    }

    /**
     * let user adjust the gas price and gas limit for all transactions
     * @param newGasPrice new gas price to be set in Qa
     * @param newGasLimit new gas limit to be set
     */
    static adjustGas = (newGasPrice: string, newGasLimit: string) => {
        gasPrice = newGasPrice;
        gasLimit = newGasLimit;
    }

    /**
     * create and sign txn with zilpay
     */
    private static zilPaySign = async (txParams: any) => {
        const zilPay = (window as any).zilPay;
        const tx = zilliqa.transactions.new(
            {
                toAddr: txParams.toAddr,
                amount: txParams.amount,
                data: txParams.data,
                gasPrice: gasPrice,
                gasLimit: gasLimit,
                version: bytes.pack(chainId, msgVersion),
            },
            true
        );
        logger(tx);

        try {
            const txn = await zilPay.blockchain.createTransaction(tx);
            return txn.ID;
        } catch (err) {
            console.error("error zilpay sign - something is wrong with broadcasting the transaction: %o", JSON.stringify(err));
            return OperationStatus.ERROR;
        }
    }

    /**
     * create and sign txn via vanilla zilliqaJS
     */
    private static sdkSign = async (txParams: any) => {
        const tx = zilliqa.transactions.new(
            {
                toAddr: txParams.toAddr,
                amount: txParams.amount,
                data: txParams.data,
                gasPrice: gasPrice,
                gasLimit: gasLimit,
                version: bytes.pack(chainId, msgVersion),
            },
            true
        );
        logger(tx);

        try {
            const txn = await zilliqa.blockchain.createTransaction(tx);
            return txn.id;
        } catch (err) {
            console.error("error sdk sign - something is wrong with broadcasting the transaction: ", JSON.stringify(err));
            console.error(err);
            return OperationStatus.ERROR;
        }
    }

    private static fetchGasPrice = async () => {
        const minimumGasPrice = await zilliqa.blockchain.getMinimumGasPrice();
        if (minimumGasPrice.result === undefined) {
            // something might be wrong with api
            gasPrice = `${Constants.DEFAULT_GAS_PRICE}`;
        } else {
            logger("min gas price from api: ", minimumGasPrice.result);
            gasPrice = minimumGasPrice.result;
        }
        return gasPrice;
    }
}