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

    static getTotalCoinSupply = async () => {
        let result;
        for (let attempt = 0; attempt < API_MAX_ATTEMPT; attempt++) {
            result = await ZilAccount.getActualTotalCoinSupply();
            if (result !== OperationStatus.ERROR) {
                break;
            }
        }
        return result;
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
    
    /**
     * Get smart contract sub state with a new zilliqa object
     * sets the network but doesn't affect the rest of the zilliqa calls such as sending transaction
     * which depends on the main zilliqa object
     * 
     * @param impl 
     * @param state 
     * @param indices 
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