import { fromBech32Address } from '@zilliqa-js/crypto';
const { validation, units } = require('@zilliqa-js/util');

export const bech32ToChecksum = (address: string) => {
    if (validation.isBech32(address)) {
        return fromBech32Address(address);
    }
    return address;
};

export const convertZilToQa = (amount: string) => {
    return units.toQa(amount, units.Units.Zil);
};

export const convertToProperCommRate = (rate: string) => {
    if (!rate) {
        return 0;
    }
    let commRate = parseInt(rate);
    return commRate / 1e7;
};

// compute the stake amount as a percentage of total stake amount
export const computeStakeAmtPercent = (inputStake: string, totalStake: string) => {
    console.log("inputStake :%o", inputStake);
    console.log("total stake amount :%o", totalStake);
    if (!inputStake) {
        return 0;
    }
    const stakePercentage = (parseInt(inputStake) / parseInt(totalStake)) * 100;
    return stakePercentage;
}

// convert commission rate from percentage to contract comm rate
// userInputRate is a float
export const percentToContractCommRate = (userInputRate: string) => {
    if (!userInputRate) {
        return 0;
    }
    return parseFloat(userInputRate) * 1e7;
};