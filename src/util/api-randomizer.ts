import { getEnvironment, getNetworkConfigByEnv } from "./config-json-helper";
import { Environment } from "./enum";

const { Random, MersenneTwister19937 } = require("random-js");
const randomJS = new Random(MersenneTwister19937.autoSeed());

const network_config = getNetworkConfigByEnv();
const default_api_list = (getEnvironment() === Environment.PROD) ? ["https://api.zilliqa.com"] : ["https://dev-api.zilliqa.com"]
const API_LIST = network_config["api_list"] || default_api_list;

/**
 * Randomize the API
 * Generate an array of random index of 1...LIST_SIZE from the above list
 * Shuffle the array and retrieve the current index
 */
export class ApiRandomizer {
    private static instance: ApiRandomizer;
    currentIndex: number;
    randomIndexList: [];

    private constructor() {
        this.currentIndex = 0;
        this.randomIndexList = randomJS.shuffle(Array.from(Array(API_LIST.length).keys()));
    }

    public static getInstance(): ApiRandomizer {
        if (!ApiRandomizer.instance) {
            ApiRandomizer.instance = new ApiRandomizer()
        }
        return ApiRandomizer.instance;
    }

    public getRandomApi() {
        let randomIndex = this.randomIndexList[this.currentIndex];
        let api = API_LIST[randomIndex];

        // fetch next random index
        this.currentIndex = this.currentIndex + 1;
        if (this.currentIndex === API_LIST.length) {
            // reset if reach the end
            this.currentIndex = 0;
        }
        return api;
    }
}