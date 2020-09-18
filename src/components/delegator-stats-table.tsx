import React, { useState, useRef, useEffect } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { PromiseArea } from '../util/enum';

import { fromBech32Address } from '@zilliqa-js/crypto';
import { convertQaToCommaStr } from '../util/utils';
import { computeDelegRewards } from '../util/reward-calculator';
import Spinner from './spinner';


const { BN, units } = require('@zilliqa-js/util');
const BigNumber = require('bignumber.js');


function DelegatorStatsTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : 3000;

    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

    const [showSpinner, setShowSpinner] = useState(false);

    // all except lastCycleAPY in Qa
    const [data, setData] = useState({
        lastCycleAPY: '0',
        zilRewards: '0',
        gzilRewards: '0',
        gzilBalance: '0',
        totalPendingWithdrawal: '0',
        totalDeposits: '0'
    });

    const mountedRef = useRef(false);

    const getData = () => {
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
                // use calculator

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
                }


                // compute gzil balance
                let totalGzilRewardsBN = new BigNumber(0);

                const gzilContract = await ZilliqaAccount.getGzilContract(contract.gziladdr);
                if (gzilContract !== undefined) {
                    const gzilBalanceMap = gzilContract.balances;
                    if (gzilBalanceMap.hasOwnProperty(userBase16Address)) {
                        // compute user gzil balance
                        
                        gzilBalance = (parseFloat(units.fromQa(new BN(gzilBalanceMap[userBase16Address]), units.Units.Zil))/1000.00).toFixed(3);
                    }

                    for (const gzilUsersAddress in gzilBalanceMap) {
                        totalGzilRewardsBN = totalGzilRewardsBN.plus(new BigNumber(gzilBalanceMap[gzilUsersAddress]));
                    }
                    gzilRewards = (parseFloat(units.fromQa(new BN(totalGzilRewardsBN.toString()), units.Units.Zil))/1000.00).toFixed(3);
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

                if (mountedRef.current) {
                    setData(prevData => ({
                        ...prevData,
                        lastCycleAPY: lastCycleAPY,
                        zilRewards: zilRewards,
                        gzilRewards: gzilRewards,
                        gzilBalance: gzilBalance,
                        totalPendingWithdrawal: totalPendingWithdrawal,
                        totalDeposits: totalDeposits,
                    }));
                }

            }), PromiseArea.PROMISE_GET_DELEG_STATS);
    };

    useEffect(() => {
        setShowSpinner(true);
        getData();
        // eslint-disable-next-line
    }, [proxy, networkURL]);

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
        // eslint-disable-next-line
    }, []);

    return (
        <>
        { showSpinner && <Spinner class="spinner-border dashboard-spinner mb-4" area={PromiseArea.PROMISE_GET_DELEG_STATS} /> }
        
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
                <span>{data.gzilBalance}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Unclaimed ZIL Rewards</h3>
                <span>{convertQaToCommaStr(data.zilRewards)}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Unclaimed GZIL Rewards</h3>
                <span>{data.gzilRewards}</span>
            </div>
        </div>
        }
        
        </>
    );
}

export default DelegatorStatsTable;