import { Zilliqa } from "@zilliqa-js/zilliqa";
import { ApiRandomizer } from "./util/api-randomizer";
import { getApiMaxRetry } from "./util/config-json-helper";
import { OperationStatus } from "./util/enum";
import { logger } from "./util/logger";

const API_MAX_ATTEMPT = getApiMaxRetry();
const API_RANDOMIZER = ApiRandomizer.getInstance();

export class ZilAccount {

    /**
     * query the contract state using random api
     * retry if there is an error in the response
     */
    static getImplStateRetriable = async (impl: string, state: string, indices?: any): Promise<any> => {
        let result;
        for (let attempt = 0; attempt < API_MAX_ATTEMPT; attempt++) {
            result = await ZilAccount.getImplState(impl, state, indices);
            if (result !== OperationStatus.ERROR) {
                break;
            }
        }
        return result;
    }

    /**
     * query the wallet balance
     * 
     * @param address wallet address in base16 or bech32 format
     * @returns amount in zils, returns '0' if the balance cannot be found
     */
    static getBalance = async (address: string): Promise<string> => {
        let result;
        for (let attempt = 0; attempt < API_MAX_ATTEMPT; attempt++) {
            result = await ZilAccount.getActualBalance(address);
            if (result !== OperationStatus.ERROR) {
                break;
            }
        }
        return result;
    }

    /**
     * fetch the total zil coin supply
     */
    static getTotalCoinSupply = async (): Promise<any> => {
        let result;
        for (let attempt = 0; attempt < API_MAX_ATTEMPT; attempt++) {
            result = await ZilAccount.getActualTotalCoinSupply();
            if (result !== OperationStatus.ERROR) {
                break;
            }
        }
        return result;
    }

    /**
     * checks if the connected wallet is a node operator
     * 
     * @param impl      contract implementation address
     * @param address   base16 wallet address to check
     * @returns true if the connected wallet is a node operator, false otherwise
     */
    static isOperator = async (impl: string, address: string): Promise<any> => {
        if (!impl || !address) {
            return false;
        }
        logger("check is operator: ", address);
        const response = await ZilAccount.getImplStateRetriable(impl, "ssnlist", [address]);

        if (!response || response === null || response === OperationStatus.ERROR) {
            return false;
        }
        return true;
    }

    private static getActualTotalCoinSupply = async () => {
        try {
            const randomAPI = API_RANDOMIZER.getRandomApi();
            const zilliqa = new Zilliqa(randomAPI);
            const response =  await zilliqa.blockchain.getTotalCoinSupply();

            if (!response.hasOwnProperty("result") || response.result === undefined) {
                return OperationStatus.ERROR;
            }
            return response.result;
        } catch (err) {
            return OperationStatus.ERROR;
        }
    }

    private static getActualBalance = async (address: string) => {
        try {
            const randomAPI = API_RANDOMIZER.getRandomApi();
            const zilliqa = new Zilliqa(randomAPI);
            const response =  await zilliqa.blockchain.getBalance(address);

            if (!response.hasOwnProperty("result") || response.result.balance === undefined) {
                return "0";
            }
            return response.result.balance;
        } catch (err) {
            return OperationStatus.ERROR;
        }
    }
    
    /**
     * Get smart contract sub state with a new zilliqa object
     * sets the network but doesn't affect the rest of the zilliqa calls such as sending transaction
     * which depends on the main zilliqa object
     * 
     * @param impl      implementation contract in checksum format
     * @param state     name of the variable in the contract
     * @param indices   JSOn array to specify the indices if the variable is a map type
     */
    private static getImplState = async (impl: string, state: string, indices?: any) => {
        if (!impl) {
            logger("error: getImplState - no implementation contract found");
            return OperationStatus.ERROR;
        }

        try {
            const randomAPI = API_RANDOMIZER.getRandomApi();
            const zilliqa = new Zilliqa(randomAPI);

            let response: any = null;
            if (indices !== null) {
                response = await zilliqa.blockchain.getSmartContractSubState(impl, state, indices);
            } else {
                response = await zilliqa.blockchain.getSmartContractSubState(impl, state);
            }

            if (!response.hasOwnProperty("result") || response.result === undefined) {
                return OperationStatus.ERROR;
            }
            return response.result;
            
        } catch (err) {
            logger(err);
            return OperationStatus.ERROR;
        }
    }
}