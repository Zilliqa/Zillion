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