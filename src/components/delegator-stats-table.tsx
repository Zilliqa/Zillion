import React, { useState, useRef, useEffect } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { PromiseArea } from '../util/enum';

import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import { convertQaToCommaStr } from '../util/utils';

const BigNumber = require('bignumber.js');


function DelegatorStatsTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : 3000;

    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

    // unclaimedZIL in Qa
    // unclaimedGZIL in Qa
    // gzilBalance in Qa
    // totalPendingWithdrawal in Qa
    const [data, setData] = useState({
        lastCycleAPY: '0',
        unclaimedZIL: '0',
        unclaimedGZIL: '0',
        gzilBalance: '0',
        totalPendingWithdrawal: '0'
    });

    const mountedRef = useRef(false);

    const getData = () => {
        let lastCycleAPY = '0';
        let unclaimedZIL = '0';
        let unclaimedGZIL = '0';
        let gzilBalance = '0';
        let totalPendingWithdrawal = '0';

        trackPromise(ZilliqaAccount.getSsnImplContract(proxy, networkURL)
            .then(async (contract) => {

                if (contract === undefined || contract === 'error') {
                    return null;
                }

                // compute last cycle APY

                // compute unclaimed ZIL
                if (contract.deposit_amt_deleg.hasOwnProperty(userBase16Address)) {
                    let totalUnclaimedZILBN = new BigNumber(0);
                    const depositDelegList = contract.deposit_amt_deleg[userBase16Address];
                    
                    for (const ssnAddress in depositDelegList) {
                        if (!depositDelegList.hasOwnProperty(ssnAddress)) {
                            continue;
                        }

                        const delegAmtQaBN = new BigNumber(depositDelegList[ssnAddress]);
                        totalUnclaimedZILBN = totalUnclaimedZILBN.plus(delegAmtQaBN);
                    }
                    unclaimedZIL = totalUnclaimedZILBN.toString();
                }

                // compute unclaimed GZIL
                const gzilContract = await ZilliqaAccount.getGzilContract(contract.gziladdr);
                if (gzilContract !== undefined) {
                    const gzilBalanceMap = gzilContract.balances;
                    if (gzilBalanceMap.hasOwnProperty(userBase16Address)) {
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

                if (mountedRef.current) {
                    setData(prevData => ({
                        ...prevData,
                        lastCycleAPY: lastCycleAPY,
                        unclaimedZIL: unclaimedZIL,
                        unclaimedGZIL: unclaimedGZIL,
                        gzilBalance: gzilBalance,
                        totalPendingWithdrawal: totalPendingWithdrawal,
                    }));
                }

            }), PromiseArea.PROMISE_GET_DELEG_STATS);
    };

    useEffect(() => {
        getData();
        // eslint-disable-next-line
    }, [proxy, networkURL]);

    useEffect(() => {
        mountedRef.current = true;
        const intervalId = setInterval(async () => {
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
        <div className="row pl-4 align-items-center justify-content-left">
            <div className="d-block deleg-stats-card">
                <h3>Last Cycle APY</h3>
                <span>{data.lastCycleAPY}%</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Unclaimed ZIL Balance</h3>
                <span>{convertQaToCommaStr(data.unclaimedZIL)}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Unclaimed GZIL Balance</h3>
                <span>{convertQaToCommaStr(data.unclaimedGZIL)}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>GZIL Balance</h3>
                <span>{convertQaToCommaStr(data.gzilBalance)}</span>
            </div>
        </div>

        <div className="row pl-4 align-items-center justify-content-left">
            <div className="d-block deleg-stats-card">
                <h3>Total Pending Withdrawal</h3>
                <span>{convertQaToCommaStr(data.totalPendingWithdrawal)}</span>
            </div>
        </div>
        </>
    );
}

export default DelegatorStatsTable;