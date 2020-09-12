import React, { useState, useRef, useEffect } from 'react';

import * as ZilliqaAccount from "../account";

import { fromBech32Address } from '@zilliqa-js/crypto';

interface Portfolio {
    totalStakeDeposit: number,
    ssnStakeList: any[],
    totalRewards: number,
    ssnRewardsList: any[]
}

function StakingPortfolio(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : 3000;
    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();
    const [data, setData] = useState({} as Portfolio);

    // prevent react update state on unmounted component 
    const mountedRef = useRef(false);

    const getData = async () => {
        let totalStakeDeposit = 0;
        let totalRewards = 0;
        let ssnStakeList: any[] = [];
        let ssnRewardsList: any[] = [];

        const contract = await ZilliqaAccount.getSsnImplContract(proxy, networkURL);

        if (contract === undefined || contract === 'error') {
            return null;
        }

        if (contract.hasOwnProperty('deposit_amt_deleg') && contract.deposit_amt_deleg.hasOwnProperty(userBase16Address)) {
            const depositDelegList = contract.deposit_amt_deleg[userBase16Address];
            for (const ssnAddress in depositDelegList) {
                console.log("staking portfolio - got ssn address :%o", ssnAddress);
                if (!depositDelegList.hasOwnProperty(ssnAddress)) {
                    continue;
                }
                const delegAmt = depositDelegList[ssnAddress];
                totalStakeDeposit += parseInt(delegAmt);
                ssnStakeList.push({
                    ssnAddress: ssnAddress,
                    delegAmt: delegAmt
                });
                console.log("staking portfolio - delegAmt :%o", delegAmt);
            }
        }

        const tempData: Portfolio = {
            totalStakeDeposit: totalStakeDeposit,
            ssnStakeList: ssnStakeList,
            totalRewards: totalRewards,
            ssnRewardsList: ssnRewardsList,
        };

        setData(prevData => ({
            ...prevData,
            totalStakeDeposit: tempData.totalStakeDeposit,
            ssnStakeList: tempData.ssnStakeList,
            totalRewards: tempData.totalRewards,
            ssnRewardsList: tempData.ssnRewardsList
        }));
    }

    useEffect(() => {
        mountedRef.current = true;
        console.log("use effect - staking portfolio multiple times");
        const intervalId = setInterval(async () => {
            await getData();
        }, refresh);
        return () => {
            clearInterval(intervalId);
            mountedRef.current = false;
        }
    }, [userBase16Address]);

    return (
        <>
        <div>
            <p>Hello</p>
            <p>Total Stake Deposit: {data.totalStakeDeposit}</p>
            <p>Total Rewards: {data.totalRewards}</p>
        </div>
        </>
    );
}

export default StakingPortfolio;