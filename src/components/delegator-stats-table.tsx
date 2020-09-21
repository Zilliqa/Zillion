import React, { useState, useRef, useEffect, useCallback } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { PromiseArea, Constants } from '../util/enum';

import { fromBech32Address } from '@zilliqa-js/crypto';
import { convertQaToCommaStr, convertGzilToCommaStr } from '../util/utils';
import { computeDelegRewards } from '../util/reward-calculator';
import { useInterval } from '../util/use-interval';
import SpinnerNormal from './spinner-normal';


const { BN } = require('@zilliqa-js/util');
const BigNumber = require('bignumber.js');


function DelegatorStatsTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : Constants.REFRESH_RATE;

    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

    const [showSpinner, setShowSpinner] = useState(true);

    const [data, setData] = useState({
        lastCycleAPY: '0',
        zilRewards: '0',
        gzilRewards: '0',
        gzilBalance: '0',
        totalPendingWithdrawal: '0',
        totalDeposits: '0'
    });

    const mountedRef = useRef(true);

    const getData = useCallback(() => {
        let lastCycleAPY = '0';
        let zilRewards = '0';
        let gzilRewards = '0';
        let gzilBalance = '0';
        let totalPendingWithdrawal = '0';
        let totalDeposits = '0';


        trackPromise(ZilliqaAccount.getSsnImplContract(proxy, networkURL)
            .then(async (contract) => {

                if (contract === undefined || contract === 'error') {
                    return null;
                }

                // compute last cycle APY
                // TODO use calculator

                if (contract.deposit_amt_deleg.hasOwnProperty(userBase16Address)) {
                    let totalDepositsBN = new BigNumber(0);
                    let totalZilRewardsBN = new BigNumber(0);
                    
                    const depositDelegList = contract.deposit_amt_deleg[userBase16Address];
                    
                    for (const ssnAddress in depositDelegList) {
                        if (!depositDelegList.hasOwnProperty(ssnAddress)) {
                            continue;
                        }

                        // compute total deposits
                        const delegAmtQaBN = new BigNumber(depositDelegList[ssnAddress]);
                        totalDepositsBN = totalDepositsBN.plus(delegAmtQaBN);

                        // compute zil rewards
                        const delegRewards = new BN(await computeDelegRewards(proxy, networkURL, ssnAddress, userBase16Address)).toString();
                        totalZilRewardsBN = totalZilRewardsBN.plus(new BigNumber(delegRewards));
                    }

                    totalDeposits = totalDepositsBN.toString();
                    zilRewards = totalZilRewardsBN.toString();

                    // compute gzil rewards
                    // converted to gzil when display
                    gzilRewards = totalZilRewardsBN;
                }

                // get gzil balance
                const gzilContract = await ZilliqaAccount.getGzilContract(contract.gziladdr);
                if (gzilContract !== undefined) {
                    const gzilBalanceMap = gzilContract.balances;
                    if (gzilBalanceMap.hasOwnProperty(userBase16Address)) {
                        // compute user gzil balance
                        gzilBalance = gzilBalanceMap[userBase16Address];
                    }
                }

                // compute total pending withdrawal
                if (contract.withdrawal_pending.hasOwnProperty(userBase16Address)) {
                    let totalPendingAmtBN = new BigNumber(0);
                    const blkNumPendingWithdrawal = contract.withdrawal_pending[userBase16Address];
                    
                    for (const blkNum in blkNumPendingWithdrawal) {
                        if (!blkNumPendingWithdrawal.hasOwnProperty(blkNum)) {
                            continue;
                        }
                        
                        const pendingAmtQaBN = new BigNumber(blkNumPendingWithdrawal[blkNum]);
                        totalPendingAmtBN = totalPendingAmtBN.plus(pendingAmtQaBN);
                    }
                    totalPendingWithdrawal = totalPendingAmtBN.toString();
                }

            })
            .finally(() => {

                if(!mountedRef.current) {
                    return null;
                }

                setShowSpinner(false);
                
                if (mountedRef.current) {
                    console.log("updating delegator stats...");
                    setData(prevData => ({
                        ...prevData,
                        lastCycleAPY: lastCycleAPY,
                        zilRewards: zilRewards,         // Qa
                        gzilRewards: gzilRewards,       // 15 dp
                        gzilBalance: gzilBalance,       // 15 dp
                        totalPendingWithdrawal: totalPendingWithdrawal,
                        totalDeposits: totalDeposits,
                    }));
                }

            }), PromiseArea.PROMISE_GET_DELEG_STATS);

    }, [proxy, networkURL, userBase16Address]);

    // load initial data
    useEffect(() => {
        getData();
        return () => {
            mountedRef.current = false;
        };
    }, [getData]);

    // poll data
    useInterval(() => {
        getData();
    }, mountedRef, refresh);

    return (
        <>
        { showSpinner && <SpinnerNormal class="spinner-border dashboard-spinner mb-4" /> }
        
        { !showSpinner &&

        <div className="row px-2 pb-3 align-items-center justify-content-center">
            <div className="d-block deleg-stats-card">
                <h3>Last Cycle APY</h3>
                <span>{data.lastCycleAPY}%</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Total Deposits</h3>
                <span>{convertQaToCommaStr(data.totalDeposits)}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Total Pending Withdrawal</h3>
                <span>{convertQaToCommaStr(data.totalPendingWithdrawal)}</span>
            </div>

            <div className="w-100"></div>

            <div className="d-block deleg-stats-card">
                <h3>GZIL Balance</h3>
                <span>{convertGzilToCommaStr(data.gzilBalance)}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Unclaimed ZIL Rewards</h3>
                <span>{convertQaToCommaStr(data.zilRewards)}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Unclaimed GZIL Rewards</h3>
                <span>{convertGzilToCommaStr(data.gzilRewards)}</span>
            </div>
        </div>
        }
        
        </>
    );
}

export default DelegatorStatsTable;