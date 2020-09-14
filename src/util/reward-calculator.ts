
const { RewardCalculator } = require('./calculator')
const { Zilliqa } = require('@zilliqa-js/zilliqa');

let rewardCalculator: typeof RewardCalculator;

export const computeDelegRewards = async (proxy: string, networkURL: string, ssn: string, delegator: string) => {
    const zilliqa = new Zilliqa(networkURL);
    const proxyContract = await zilliqa.blockchain.getSmartContractState(proxy);

    if (proxyContract.result.hasOwnProperty('implementation')) {
        const implAddress = proxyContract.result.implementation;
        if (!rewardCalculator) {
            rewardCalculator = new RewardCalculator(networkURL, implAddress);
        }
        console.log("reward calculator - %o", proxy);
        console.log("reward calculator - %o", networkURL);
        console.log("reward calculator - %o", implAddress);
        console.log("reward calculator - %o", ssn);
        console.log("reward calculator - %o", delegator);
        return rewardCalculator.get_rewards(ssn, delegator);
    }
    return 0;
};