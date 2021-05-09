import { NetworkURL } from "./enum";

const { Random, MersenneTwister19937 } = require("random-js");
const randomJS = new Random(MersenneTwister19937.autoSeed());

// read from public/config.js
let { networks_config } = (window as { [key: string]: any })['config'];

// Testnet
// defaults to dev-api,zilliqa if config.js not found
const TESTNET_API_LIST = networks_config["testnet"]["api_list"] || ["https://dev-api.zilliqa.com"];

// Mainnet
// defaults to api.zilliqa if config.js not found
const MAINNET_API_LIST = networks_config["mainnet"]["api_list"] || ["https://api.zilliqa.com"];


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