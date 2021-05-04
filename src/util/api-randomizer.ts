import { NetworkURL } from "./enum";

const { Random, MersenneTwister19937 } = require("random-js");
const randomJS = new Random(MersenneTwister19937.autoSeed());

// Testnet
const TESTNET_API_LIST = [
    "https://bumblebee-api.zilliqa.network",
    "https://dev-api.zilliqa.com",
];

// https://seed-dev-api.zillet.io           CORS error
// https://ssntestnet.zillacracy.com/api    CORS error


// Mainnet
const MAINNET_API_LIST = [
    "https://ssn.zillacracy.com/api",
    "https://ssn-zilliqa.cex.io/api",
    "https://ssn.zillet.io",
    "https://zil-staking.ezil.me/api",
    "https://staking-zil.kucoin.com/api",
    "https://stakingseed-api.seed.zilliqa.com",
    "https://api.zilliqa.com",
];

// https://ssn-zilliqa.moonlet.network/api , CORS error
// https://zilliqa-api.staked.cloud, out-of-sync
// "https://ssn-api-mainnet.viewblock.io", rate limit

/**
 * Randomize the API
 * Generate an array of random index of 1...LIST_SIZE from the above list
 * Shuffle the array and retrieve the current index
 */
export class ApiRandomizer {
    private static instance: ApiRandomizer;
    currentIndex: number;
    testnetRandomIndexList: [];
    mainnetRandomIndexList: [];

    private constructor() {
        this.currentIndex = 0;
        this.testnetRandomIndexList = randomJS.shuffle(Array.from(Array(TESTNET_API_LIST.length).keys()));
        this.mainnetRandomIndexList = randomJS.shuffle(Array.from(Array(MAINNET_API_LIST.length).keys()));
    }

    public static getInstance(): ApiRandomizer {
        if (!ApiRandomizer.instance) {
            ApiRandomizer.instance = new ApiRandomizer();
        }
        return ApiRandomizer.instance;
    }

    public getRandomApi(networkURL: string) {
        let api = "";
        let randomIndex = 0;
        let currentList = [];
        if (networkURL === NetworkURL.MAINNET) {
            randomIndex = this.mainnetRandomIndexList[this.currentIndex];
            currentList = MAINNET_API_LIST;      
        } else {
            randomIndex = this.testnetRandomIndexList[this.currentIndex];
            currentList = TESTNET_API_LIST;
        }
        api = currentList[randomIndex];

        // fetch next random index
        this.currentIndex = this.currentIndex + 1;
        if (this.currentIndex === currentList.length) {
            // reset if reach the end
            this.currentIndex = 0;
        }
        return api;
    }
}