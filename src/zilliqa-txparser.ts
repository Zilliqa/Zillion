import { BN } from "@zilliqa-js/util";
import { StakingMode } from "./util/enum";
import { bech32ToChecksum } from "./util/utils";
import store from "./store/store";

/**
 * util class to craft the tx params
 */
export class ZilTxParser {

    /**
     * [bzil staking] create tx params for delegate
     * @param ssnaddr 
     * @param vaultId 
     * @param amount 
     * @param gasPrice 
     * @param gasLimit 
     * @returns 
     */
    static parseDelegateBZIL = (ssnaddr: String, vaultId: Number, amount: String, gasPrice: String, gasLimit: String) => {
        const { toAddr } = ZilTxParser.getToAddr();
        let tag = "Delegate";

        console.log("toaddr: ", toAddr);
        console.log("tag: ", tag);
        console.log("amount: ", amount.toString());

        const params =
        [
            {
                vname: 'ssnaddr',
                type: 'ByStr20',
                value: `${ssnaddr}`,
            },
            {
                vname: 'vault_id',
                type: 'Uint128',
                value: `${vaultId}`,
            }
        ]

        return ZilTxParser.createTxParams(toAddr, amount, tag, params, gasPrice, gasLimit)
    }

    /**
     * [normal staking] create tx params for delegate
     * @param ssnaddr ByStr20 ssn address
     * @param amount delegate amount in Qa
     * @param gasPrice gas price in Qa
     * @param gasLimit
     * @returns tx params JSON obj
     */
    static parseDelegate = (ssnaddr: String, amount: String, gasPrice: String, gasLimit: String) => {
        const { toAddr } = ZilTxParser.getToAddr();
        let tag = "DelegateStake";

        console.log("toaddr: ", toAddr);
        console.log("tag: ", tag);
        console.log("amount: ", amount.toString());

        const params =
        [
            {
                vname: 'ssnaddr',
                type: 'ByStr20',
                value: `${ssnaddr}`,
            }
        ];

        return ZilTxParser.createTxParams(toAddr, amount, tag, params, gasPrice, gasLimit);
    }

    /**
     * create tx params for withdraw stake
     * @param ssnaddr ByStr20 ssn address
     * @param amount withdraw amount in Qa
     * @param gasPrice gas price in Qa
     * @param gasLimit 
     * @returns tx params JSON obj
     */
    static parseWithdrawStakeAmount = (ssnaddr: String, amount: String, gasPrice: String, gasLimit: String) => {
        const { toAddr } = ZilTxParser.getToAddr();
        let tag = "WithdrawStakeAmt";

        const params = [
            {
                vname: 'ssnaddr',
                type: 'ByStr20',
                value: `${ssnaddr}`,
            },
            {
                vname: 'amt',
                type: 'Uint128',
                value: `${amount}`,
            }
        ]

        return ZilTxParser.createTxParams(toAddr, amount, tag, params, gasPrice, gasLimit);
    }

    /**
     * create tx params for withdraw rewards
     * @param ssnaddr ByStr20 ssn address
     * @param gasPrice gas price in Qa
     * @param gasLimit 
     * @returns tx params JSON obj
     */
    static parseWithdrawStakeRewards = (ssnaddr: String, gasPrice: String, gasLimit: String) => {
        const { toAddr } = ZilTxParser.getToAddr();
        let tag = "WithdrawStakeRewards";

        const params = [
            {
                vname: 'ssnaddr',
                type: 'ByStr20',
                value: `${ssnaddr}`,
            }
        ]

        return ZilTxParser.createTxParams(toAddr, "0", tag, params, gasPrice, gasLimit);
    }

    /**
     * create tx params for complete withdrawal
     * @param gasPrice gas price in Qa
     * @param gasLimit 
     * @returns tx params JSON obj
     */
    static parseCompleteWithdrawal = (gasPrice: String, gasLimit: String) => {
        const { toAddr } = ZilTxParser.getToAddr();
        let tag = "CompleteWithdrawal";

        return ZilTxParser.createTxParams(toAddr, "0", tag, [], gasPrice, gasLimit);
    }

    /**
     * create tx params for redelegate
     * @param fromSsnAddr ByStr20 from which ssn address to transfer from
     * @param toSsnAddr ByStr20 to which ssn address to transfer to
     * @param amount amount in Qa to redelegate
     * @param gasPrice 
     * @param gasLimit 
     * @returns 
     */
    static parseRedelegate = (fromSsnAddr: String, toSsnAddr: String, amount: String, gasPrice: String, gasLimit: String) => {
        const { toAddr } = ZilTxParser.getToAddr();
        let tag = "ReDelegateStake";

        const params = [
            {
                vname: 'ssnaddr',
                type: 'ByStr20',
                value: `${fromSsnAddr}`,
            },
            {
                vname: 'to_ssn',
                type: 'ByStr20',
                value: `${toSsnAddr}`,
            },
            {
                vname: 'amount',
                type: 'Uint128',
                value: `${amount}`,
            }
        ];

        return ZilTxParser.createTxParams(toAddr, amount, tag, params, gasPrice, gasLimit);
    }

    private static createTxParams = (toAddr: String, amount: String, tag: String, params: any, gasPrice: String, gasLimit: String) => {
        return {
            toAddr: toAddr,
            amount: new BN(`${amount}`),
            code: "",
            data: JSON.stringify({
                _tag: tag,
                params: [...params],
            }),
            gasPrice: gasPrice,
            gasLimit: gasLimit,
        }
    }

    /**
     * Determine the contract toAddr from the staking mode
     * @returns toAddr and mode
     */
    private static getToAddr = () => {
        const { staking_mode } = store.getState().user;
        const { proxy, staking_registry } = store.getState().blockchain;

        let toAddr = (staking_mode === StakingMode.BZIL) ? staking_registry : proxy;
        toAddr = bech32ToChecksum(toAddr);
        
        return {
            toAddr: toAddr,
            mode: staking_mode
        };
    }

}