import { getRandomAPI } from "./random-api";

const { RewardCalculator } = require('./calculator');

let rewardCalculator: typeof RewardCalculator;

export const computeDelegRewards = async (impl: string, networkURL: string, ssn: string, delegator: string) => {
    if (!rewardCalculator) {
        rewardCalculator = new RewardCalculator(getRandomAPI(networkURL), impl);
        await rewardCalculator.compute_maps(delegator);
    }

    return rewardCalculator.get_rewards(ssn, delegator);
};