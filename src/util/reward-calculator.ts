
const { RewardCalculator } = require('./calculator')

let rewardCalculator: typeof RewardCalculator;

export const computeDelegRewards = async (impl: string, networkURL: string, ssn: string, delegator: string) => {
    if (!rewardCalculator) {
        rewardCalculator = new RewardCalculator(networkURL, impl);
    }

    return rewardCalculator.get_rewards(ssn, delegator);
};