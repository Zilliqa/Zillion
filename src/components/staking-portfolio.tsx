import React, { useState, useRef, useEffect } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from "../account";
import Spinner from './spinner';
import { PromiseArea } from '../util/enum';
import { convertQaToCommaStr, computeStakeAmtPercent } from '../util/utils';

import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';

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

    const [showSpinner, setShowSpinner] = useState(false);
    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();
    const [data, setData] = useState({
            totalStakeDeposit: 0,
            ssnStakeList: 0,
            totalRewards: [],
            ssnRewardsList: [],
        } as unknown as Portfolio);

    // prevent react update state on unmounted component 
    const mountedRef = useRef(false);

    const getData = async () => {
        let totalStakeDeposit = 0;
        let totalRewards = 0;
        let ssnStakeList: any[] = [];
        let ssnRewardsList: any[] = [];

        trackPromise(ZilliqaAccount.getSsnImplContract(proxy, networkURL)
            .then((contract) => {
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

                if (mountedRef.current) {
                    setData(prevData => ({
                        ...prevData,
                        totalStakeDeposit: tempData.totalStakeDeposit,
                        ssnStakeList: tempData.ssnStakeList,
                        totalRewards: tempData.totalRewards,
                        ssnRewardsList: tempData.ssnRewardsList
                    }));
                }
            }), PromiseArea.PROMISE_GET_STAKE_PORTFOLIO);
    }

    useEffect(() => {
        setShowSpinner(true);
        getData();
        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        mountedRef.current = true;
        const intervalId = setInterval(async () => {
            setShowSpinner(false);
            getData();
        }, refresh);
        return () => {
            clearInterval(intervalId);
            mountedRef.current = false;
        }
    }, [proxy, networkURL, userBase16Address]);

    return (
        <>
        { showSpinner && <Spinner class="spinner-border dashboard-spinner" area={PromiseArea.PROMISE_GET_STAKE_PORTFOLIO} /> }
        <div id="stake-portfolio-accordion">
            <div className="card">
                <div className="card-header">
                    <a className="card-link" data-toggle="collapse" href="#portfolio-total-stake">You have deposited a total of: {convertQaToCommaStr(data.totalStakeDeposit.toString())} ZIL (Click to view details)</a>
                </div>
                <div id="portfolio-total-stake" className="collapse" data-parent="#stake-portfolio-accordion">
                    <div className="card-body">
                        { data.ssnStakeList && data.ssnStakeList.map((ssn) => {
                            return <p>{toBech32Address(ssn.ssnAddress)} : {convertQaToCommaStr(ssn.delegAmt)} ZIL ({computeStakeAmtPercent(ssn.delegAmt.toString(), data.totalStakeDeposit.toString()).toFixed(2)})%</p>
                        }) }
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}

export default StakingPortfolio;