/**
 * fetch a random API from a pre-defined list
 * used to minimize load on main API
 */


import { NetworkURL } from "./enum";

const { Random, MersenneTwister19937 } = require("random-js");
const randomJS = new Random(MersenneTwister19937.autoSeed());

// Testnet
const TESTNET_API_LIST = [
    "https://bumblebee-api.zilliqa.network",
    "https://ssntestnet.zillacracy.com/api",
    "https://seed-dev-api.zillet.io"
];


// Mainnet
const MAINNET_API_LIST = [
    "https://zilliqa-api.staked.cloud",
];

// https://staking-zil.kucoin.com/api", CORS error
// https://ssn-zilliqa.moonlet.network/api , CORS error


// @todo: check api aliveness?
export const getRandomAPI = (networkURL: string) => {
    let api = "";
    // determine from the network URL
    // network URL should be api.zilliqa.com or dev-api.zilliqa.com
    // if it is testnet or mainnet
    if (networkURL === NetworkURL.MAINNET) {
        const index = randomJS.integer(0, (MAINNET_API_LIST.length-1));
        api = MAINNET_API_LIST[index];
    } else {
        // everything else is testnet
        const index = randomJS.integer(0, (TESTNET_API_LIST.length-1));
        api = TESTNET_API_LIST[index];
    }
    console.log("utilizing random api: %o", api);
    return api;
};