import { ApiRandomizer } from "./api-randomizer";

const apiRandomizer = ApiRandomizer.getInstance();
const { RewardCalculator } = require('./calculator');

// config.js from public folder
 // max retry attempt: 10 tries
 let { api_max_retry_attempt } = (window as { [key: string]: any })['config'];
 api_max_retry_attempt = api_max_retry_attempt ? api_max_retry_attempt : 10;

let rewardCalculator: typeof RewardCalculator;

export const computeDelegRewards = async (impl: string, networkURL: string, ssn: string, delegator: string) => {
    if (!rewardCalculator) {
        rewardCalculator = new RewardCalculator(networkURL, impl);
        await rewardCalculator.compute_maps(delegator);
    }

    return rewardCalculator.get_rewards(ssn, delegator);
};

export const computeDelegRewardsRetriable = async (impl: string, networkURL: string, ssn: string, delegator: string) => {
    let result;

    for (let attempt = 0; attempt < api_max_retry_attempt; attempt++) {
        try {
            const randomAPI = apiRandomizer.getRandomApi(networkURL);
            result = await computeDelegRewards(impl, randomAPI, ssn, delegator);
            break;
        } catch (err) {
            // error with querying api
            // retry
            continue;
        }
    }
    return result;
};