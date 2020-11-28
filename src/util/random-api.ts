/**
 * fetch a random API from a pre-defined list
 * used to minimize load on main API
 */

import { NetworkURL } from "./enum";

// Testnet
const TESTNET_API_LIST = [
    "http://18.133.61.123:4201",
    "https://seed-dev-api.zillet.io",
    "http://optimus-api-elb-267956463.us-west-2.elb.amazonaws.com"
];


// Mainnet
const MAINNET_API_LIST = [
    "https://ssn.zillacracy.com/api",
    "https://zilliqa.atomicwallet.io/api",
    "https://ssn-api-mainnet.viewblock.io",
    "https://ssn-zilliqa.cex.io/api",
    "https://ssn.zillet.io",
    "https://zil-staking.ezil.me/api",
    "https://stakingseed-api.seed.zilliqa.com",
    "https://seed-zil.shardpool.io",
    "https://zilliqa-api.staked.cloud",
];

// "https://staking-zil.kucoin.com/api", CORS error
// https://ssn-zilliqa.moonlet.network/api , CORS error


// @todo: check api aliveness?
export const getRandomAPI = (networkURL: string) => {
    let api = "";
    // determine from the network URL
    // network URL should be api.zilliqa.com or dev-api.zilliqa.com
    // if it is testnet or mainnet
    if (networkURL === NetworkURL.MAINNET) {
        const index = getRandomIndex(MAINNET_API_LIST.length-1);
        api = MAINNET_API_LIST[index];
    } else {
        // everything else is testnet
        const index = getRandomIndex(TESTNET_API_LIST.length-1);
        api = TESTNET_API_LIST[index];
    }
    console.log("utilizing random api: %o", api);
    return api;
};

// fetch random array index
// max is (array_length - 1)
// return a number between 0 inclusive to (array_length - 1) inclusive
function getRandomIndex(max:number) {
    const min = 0;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}