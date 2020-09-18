import { fromBech32Address } from '@zilliqa-js/crypto';
import { Explorer, NetworkURL } from './enum';
const { BN, validation, units } = require('@zilliqa-js/util');
const BigNumber = require('bignumber.js');

// config.js from public folder
const { blockchain_explorer_config } = (window as { [key: string]: any })['config'];

export const bech32ToChecksum = (address: string) => {
    if (validation.isBech32(address)) {
        return fromBech32Address(address);
    }
    return address;
};

export const convertZilToQa = (amount: string) => {
    return units.toQa(amount, units.Units.Zil);
};

// convert from sdk "float" representation to percentage
// sdk "float" is represented in 1e7 format
export const convertToProperCommRate = (rate: string) => {
    if (!rate) {
        return 0;
    }
    let commRate = new BigNumber(rate).dividedBy(10**7);
    return commRate;
};

// compute the stake amount as a percentage of total stake amount
// returns a BigNumber
export const computeStakeAmtPercent = (inputStake: string, totalStake: string) => {
    if (!inputStake) {
        return 0;
    }
    const inputStakeBN = new BigNumber(inputStake);
    const totalStakeBN = new BigNumber(totalStake);
    const stakePercentage = inputStakeBN.dividedBy(totalStakeBN).times(100);
    return stakePercentage;
}

// convert commission rate from percentage to contract comm rate
// userInputRate is a float
// returns a big number
export const percentToContractCommRate = (userInputRate: string) => {
    if (!userInputRate) {
        return 0;
    }
    let scillaFloat = new BigNumber(userInputRate).times(10**7);
    return scillaFloat;
};

// convert balances and other numbers into string
// with commas as thousand separators and decimals places
export const convertQaToCommaStr = (inputVal: string) => {
    let zil = units.fromQa(new BN(inputVal), units.Units.Zil);
    let zilProperDecimalStr = BigNumber(zil).toFixed(3);
    return zilProperDecimalStr.replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

export const getTxnLink = (txnId: string, networkURL: string) => {
    let link = "";

    if (blockchain_explorer_config === Explorer.VIEWBLOCK) {
        if (networkURL === NetworkURL.MAINNET) {
            link = "https://viewblock.io/zilliqa/tx/0x" + txnId
        } else {
            link = "https://viewblock.io/zilliqa/tx/0x" + txnId  + "?network=testnet"
        }
    } else {
        // devex
        link = "https://devex.zilliqa.com/tx/0x" + txnId + "?network=" + networkURL;
    }

    return link;
}

export const getAddressLink = (address: string, networkURL: string) => {
    let link = "";

    if (blockchain_explorer_config === Explorer.VIEWBLOCK) {
        if (networkURL === NetworkURL.MAINNET) {
            link = "https://viewblock.io/zilliqa/address/" + address
        } else {
            link = "https://viewblock.io/zilliqa/address/" + address  + "?network=testnet"
        }
    } else {
        // devex
        link = "https://devex.zilliqa.com/address/" + address + "?network=" + networkURL;
    }
    
    return link;
}

// returns the zil address with '...'
export const getTruncatedAddress = (address: string) => {
    if (!address) {
        return "";
    }
    const addressLen = address.length;
    const front = address.substring(0, 6);
    const end = address.substring(addressLen-4);
    return front.concat("...", end);
}