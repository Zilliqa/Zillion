
const { RewardCalculator } = require('./calculator')

let rewardCalculator: typeof RewardCalculator;

export const computeDelegRewards = async (proxy: string, networkURL: string, ssn: string, delegator: string) => {
    if (!rewardCalculator) {
        rewardCalculator = new RewardCalculator(networkURL, proxy);
    }

    return rewardCalculator.get_rewards(ssn, delegator);
};