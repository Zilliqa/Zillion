import store from "../store/store"

const { Random, MersenneTwister19937 } = require("random-js");
const randomJS = new Random(MersenneTwister19937.autoSeed());

/**
 * Randomize the API
 * Generate an array of random index of 1...LIST_SIZE from the above list
 * Shuffle the array and retrieve the current index
 */
export class ApiRandomizer {
    private static instance: ApiRandomizer;
    currentIndex: number;
    randomIndexList: [];
    apiList: [];

    private constructor() {
        this.currentIndex = 0;
        this.randomIndexList = [];
        this.apiList = [];
    }

    public static getInstance(): ApiRandomizer {
        if (!ApiRandomizer.instance) {
            ApiRandomizer.instance = new ApiRandomizer()
        }
        return ApiRandomizer.instance;
    }

    public fetchSsnApi() {
        if (this.apiList.length > 0) {
            return;
        }
        const fetchedList = store.getState().blockchain.api_list;
        this.apiList = [...fetchedList];
        this.randomIndexList = randomJS.shuffle(Array.from(Array(this.apiList.length).keys()));
    }

    public getRandomApi() {
        let api = "";
        let randomIndex = 0;

        randomIndex = this.randomIndexList[this.currentIndex];
        api = this.apiList[randomIndex];

        // fetch next random index
        this.currentIndex = this.currentIndex + 1;
        if (this.currentIndex === this.apiList.length) {
            // reset if reach the end
            this.currentIndex = 0;
        }
        return api;
    }
}