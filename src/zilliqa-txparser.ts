import { BN } from "@zilliqa-js/util";
import { StakingMode } from "./util/enum";
import { bech32ToChecksum } from "./util/utils";
import store from "./store/store";

/**
 * util class to craft the tx params
 */
export class ZilTxParser {

    /**
     * create tx params for delegate
     * @param ssnaddr ByStr20 ssn address
     * @param amount delegate amount in Qa
     * @param gasPrice gas price in Qa
     * @param gasLimit
     * @returns tx params JSON obj
     */
    static parseDelegate = (ssnaddr: String, amount: String, gasPrice: String, gasLimit: String) => {
        const { staking_mode } = store.getState().user;
        const { proxy, staking_registry } = store.getState().blockchain;

        let toAddr = (staking_mode === StakingMode.BZIL) ? staking_registry : proxy;
        toAddr = bech32ToChecksum(toAddr);
        let tag = (staking_mode === StakingMode.BZIL) ? "Delegate" : "DelegateStake";

        console.log("delegate mode: ", staking_mode);
        console.log("toaddr: ", toAddr);
        console.log("tag: ", tag);
        console.log("amount: ", amount.toString());
        
        return {
            toAddr: toAddr,
            amount: new BN(`${amount}`),
            code: "",
            data: JSON.stringify({
                _tag: tag,
                params: [
                    {
                        vname: 'ssnaddr',
                        type: 'ByStr20',
                        value: `${ssnaddr}`,
                    }
                ]
            }),
            gasPrice: gasPrice,
            gasLimit: gasLimit,
        }
    }
}