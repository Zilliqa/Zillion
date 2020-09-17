import React, { useState, useRef, useEffect } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { PromiseArea } from '../util/enum';

import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';


function DelegatorStatsTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : 3000;

    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

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
            .then((contract) => {

                if (contract === undefined || contract === 'error') {
                    return null;
                }

                // compute last cycle APY

                // compute unclaimed ZIL

                // compute unclaimed GZIL

                // compute total pending withdrawal

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
                <span>{data.unclaimedZIL}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Unclaimed GZIL Balance</h3>
                <span>{data.unclaimedGZIL}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>GZIL Balance</h3>
                <span>{data.gzilBalance}</span>
            </div>
        </div>

        <div className="row pl-4 align-items-center justify-content-left">
            <div className="d-block deleg-stats-card">
                <h3>Total Pending Withdrawal</h3>
                <span>{data.totalPendingWithdrawal}</span>
            </div>
        </div>
        </>
    );
}

export default DelegatorStatsTable;