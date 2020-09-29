import { convertNetworkUrlToLabel } from "./utils";

/*
 * store item in local storage

 * <wallet_address> : {
 *     <network>: {
 *         key1: value,
 *         key2: value
 *     }
 * }
 * 
 * wallet: bech32 address
 * network: blockchain url will convert to label later
 * key: storage key
 * value: storage value
 * 
*/
export function storeLocalItem(wallet: string, network: string, key: string, value: any) {
    network = convertNetworkUrlToLabel(network);
    const storedValue: any = window.localStorage.getItem(wallet);
    let currStorageMap: any;

    if (storedValue !== null) {
        let localStorageMap = JSON.parse(storedValue);
        
        if (localStorageMap.hasOwnProperty(network) && key in localStorageMap[network]) {
            // update the respective section only
            localStorageMap[network][key] = value;

        } else if (!localStorageMap.hasOwnProperty(network)) {
            // first time this particular wallet address is storing on this network
            localStorageMap[network] = {};
            localStorageMap[network][key] = value;

        } else {
            // first time this particular wallet address is storing this value
            localStorageMap = {};
            localStorageMap[network] = {};
            localStorageMap[network][key] = value; 
        }
        currStorageMap = localStorageMap;

    } else {
        currStorageMap = {};
        currStorageMap[network] = {};
        currStorageMap[network][key] = value;
    }

    window.localStorage.setItem(wallet, JSON.stringify(currStorageMap));
}

/*
 * retrieve item from local storage if exists
 * returns defaultValue if item does not exist
 * 
 * wallet: bech32 address
 * network: blockchain url will convert to label later
 * key: storage key
*/
export function getLocalItem(wallet: string, network: string, key: string, defaultValue: any) {
    network = convertNetworkUrlToLabel(network);
    const storedValue: any = window.localStorage.getItem(wallet);

    if (storedValue !== null) {
        const localStorageMap = JSON.parse(storedValue);
        if (localStorageMap.hasOwnProperty(network) && key in localStorageMap[network]) {
            return localStorageMap[network][key];
        }
    }
    return defaultValue;
}