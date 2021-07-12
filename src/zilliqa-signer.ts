import { fromBech32Address, validation, Zilliqa } from "@zilliqa-js/zilliqa";
import { BN, Long } from '@zilliqa-js/util'
import { RPCMethod } from "@zilliqa-js/core"
import { LedgerZilliqa } from "./ledger-zilliqa";
import { AccountType, Constants, LedgerIndex, NetworkURL, OperationStatus } from "./util/enum";
import { logger } from "./util/logger";

const { bytes } = require('@zilliqa-js/util');


let zilliqa: Zilliqa = new Zilliqa("");
let chainId = 1;
let msgVersion = 1;
let gasPrice = `${Constants.DEFAULT_GAS_PRICE}`;
let gasLimit = `${Constants.DEFAULT_GAS_LIMIT}`;


export class ZilSigner {

    /**
     * change the network properties in the zilliqa obj and adjust the gas price accordingly
     * @param networkURL api url
     */
    static changeNetwork = async (networkURL: string): Promise<void> => {
        // zilliqa.setProvider(new HTTPProvider(networkURL));
        zilliqa = new Zilliqa(networkURL);

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
                result = await ZilSigner.ledgerSign(txParams, ledgerIndex!);
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
     * returns the gas fee in Qa
     */
    static getGasFees = () => {
        return new BN(gasLimit).mul(new BN(gasPrice));
    }

    /**
     * create and sign txn with ledger
     */
    private static ledgerSign = async (txParams: any, ledgerIndex: number) => {
        logger("activate ledger signer");
        if (ledgerIndex === null || ledgerIndex === LedgerIndex.DEFAULT) {
            throw new Error("no ledger index found");
        }
        const transport = await LedgerZilliqa.getTransport();
        const ledger = new LedgerZilliqa(transport);
        const result = await ledger.getPublicAddress(ledgerIndex);

        // get public key
        let pubKey = result.pubKey;

        // get user base 16 address
        let userWalletAddress = result.pubAddr;
        if (validation.isBech32(userWalletAddress)) {
            userWalletAddress = fromBech32Address(userWalletAddress);
        }

        logger("wallet: ", userWalletAddress);

        // get nonce
        let nonce = await ZilSigner.getNonce(userWalletAddress);

        try {
            const txnParams = {
                version: bytes.pack(chainId, msgVersion),
                toAddr: txParams.toAddr,
                amount: `${txParams.amount}`,
                code: txParams.code,
                data: txParams.data,
                gasPrice: `${gasPrice}`,
                gasLimit: `${gasLimit}`,
                nonce: nonce,
                pubKey: pubKey,
                signature: "",
            }

            const signature = await ledger.signTxn(ledgerIndex, txnParams);
            const signedTx = {
                ...txnParams,
                amount: `${txParams.amount}`,
                gasPrice: `${gasPrice}`,
                gasLimit: `${gasLimit}`,
                signature
            }
            logger("signed tx: ", signedTx);

            // send the signed transaction
            try {
                const response = await zilliqa.provider.send(RPCMethod.CreateTransaction, { ...signedTx });
                if (response.error !== undefined) {
                    throw new Error(response.error.message)
                }
                return response.result.TranID
            } catch (err) {
                console.log("something is wrong with broadcasting the transaction :%o", JSON.stringify(err));
                return OperationStatus.ERROR;
            }

        } catch (err) {
            console.error("error ledger sign - something is wrong with signing the transaction: %o", JSON.stringify(err));
            return OperationStatus.ERROR;
        
        } finally {
            transport.close();
        }
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
                gasPrice: new BN(gasPrice),
                gasLimit: Long.fromNumber(Number(gasLimit)),
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
                gasPrice: new BN(gasPrice),
                gasLimit: Long.fromNumber(Number(gasLimit)),
                version: bytes.pack(chainId, msgVersion),
            },
            true
        );
        logger(tx);

        try {
            const txn = await zilliqa.blockchain.createTransaction(tx);
            return txn.id || '';
        } catch (err) {
            console.error("error sdk sign - something is wrong with broadcasting the transaction: ", JSON.stringify(err));
            console.error(err);
            return OperationStatus.ERROR;
        }
    }

    private static getNonce = async (address: string) => {
        try {
            const balance = await zilliqa.blockchain.getBalance(address);
            if (balance.error && balance.error.code === -5) {
                logger("account has no balance");
                return -1;
            }
            return parseInt(balance.result.nonce) + 1;
        } catch (err) {
            console.error("error get nonce from ledger");
            console.error(err);
            return -1;
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