import React, { useState, useRef, useEffect, useCallback } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { Constants, PromiseArea, OperationStatus } from '../util/enum';
import { convertZilToQa, convertQaToCommaStr, convertGzilToCommaStr } from '../util/utils';
import { useInterval } from '../util/use-interval';
import SpinnerNormal from './spinner-normal';
import { useAppSelector } from '../store/hooks';
import { getRefreshRate } from '../util/config-json-helper';
import { LandingStats } from '../util/interface';

const BigNumber = require('bignumber.js');

const MAX_GZIL_SUPPLY = Constants.MAX_GZIL_SUPPLY.toString();
const TOTAL_REWARD_SEED_NODES = Constants.TOTAL_REWARD_SEED_NODES.toString(); // 110000 * 17

function LandingStatsTable(props: any) {
    const impl = useAppSelector(state => state.blockchain.impl);
    const gzilTotalSupply = useAppSelector(state => state.staking.gzil_total_supply);
    const totalStakeAmount: string = useAppSelector(state => state.staking.total_stake_amount);
    const loading : OperationStatus = useAppSelector(state => state.staking.is_landing_stats_loading);
    const landingStats: LandingStats = useAppSelector(state => state.staking.landing_stats);
    const refresh = getRefreshRate() ? getRefreshRate() : Constants.REFRESH_RATE
    const [showSpinner, setShowSpinner] = useState(false);
    const mountedRef = useRef(true);

    // const [data, setData] = useState({
    //     circulatingSupplyStake: '0',
    //     nodesNum: '0',
    //     delegNum: '0',
    //     gzil: '0',
    //     remainingGzil: '0',
    //     totalDeposits: '0',
    //     estRealtimeAPY: '0'
    // });

    // const getData = useCallback(() => {
    //     let circulatingSupplyStake = '0';
    //     let nodesNum = '0';
    //     let delegNum = '0';
    //     let remainingGzil = '0';
    //     let estAPY = new BigNumber(0);

    //     // use last_withdraw_cycle_deleg instead of deposit_amt_deleg to compute total number of unique delegators
    //     // because the map size is smaller
    //     trackPromise(ZilliqaAccount.getImplStateExplorerRetriable(impl, "last_withdraw_cycle_deleg")
    //         .then(async (contractState) => {
    //             if (contractState === undefined || contractState === null || contractState === 'error') {
    //                 return null;
    //             }
    //             // compute number of nodes and delegators
    //             let nodesMap: any = await ZilliqaAccount.getImplStateExplorerRetriable(impl, "comm_for_ssn");

    //             if (nodesMap !== undefined && nodesMap !== 'error' && nodesMap !== null) {
    //                 nodesNum = Object.keys(nodesMap.comm_for_ssn).length.toString();
    //             }
    //             delegNum = Object.keys(contractState.last_withdraw_cycle_deleg).length.toString();

    //             const totalCoinSupply = await ZilliqaAccount.getTotalCoinSupplyWithNetworkRetriable();

    //             if (totalCoinSupply !== OperationStatus.ERROR && totalCoinSupply.result !== undefined) {
    //                 const totalCoinSupplyBN = new BigNumber(convertZilToQa(totalCoinSupply.result));
    //                 const totalStakeAmountBN = new BigNumber(totalStakeAmount);

    //                 if (!totalCoinSupplyBN.isZero()) {
    //                     circulatingSupplyStake = (totalStakeAmountBN.dividedBy(totalCoinSupplyBN)).times(100).toFixed(5);
    //                 }
    //             }

    //             // compute total number of gzil
    //             console.log("landing-stats gzilTotalSupply ", gzilTotalSupply);
    //             const maxGzilSupply = new BigNumber(MAX_GZIL_SUPPLY).shiftedBy(15);
    //             console.log(maxGzilSupply.toString());
    //             const remainGzil = maxGzilSupply.minus(new BigNumber(gzilTotalSupply));
    //             // compute remaining gzil percentage
    //             remainingGzil = (remainGzil.dividedBy(maxGzilSupply)).times(100).toFixed(2);

    //             // compute est. APY
    //             let temp = new BigNumber(totalStakeAmount);

    //             if (!temp.isEqualTo(0)) {
    //                 estAPY = new BigNumber(convertZilToQa(TOTAL_REWARD_SEED_NODES)).dividedBy(temp).times(36500).toFixed(2);
    //             }

    //         })
    //         .finally(() => {
    //             if(!mountedRef.current) {
    //                 return null;
    //             }

    //             setShowSpinner(false);

    //             if (mountedRef.current) {
    //                 console.log("updating landing stats...");
    //                 setData(prevData => ({
    //                     ...prevData,
    //                     circulatingSupplyStake: circulatingSupplyStake.toString(),
    //                     nodesNum: nodesNum,
    //                     delegNum: delegNum,
    //                     gzil: gzilTotalSupply,
    //                     remainingGzil: remainingGzil.toString(),
    //                     totalDeposits: totalStakeAmount,
    //                     estRealtimeAPY: estAPY.toString(),
    //                 }));
    //             }
    //         }), PromiseArea.PROMISE_LANDING_STATS);
            
    // }, [impl, totalStakeAmount, gzilTotalSupply]);

    // // load inital data
    // useEffect(() => {
    //     getData();
    //     return () => {
    //         mountedRef.current = false;
    //     };
    // }, [getData]);

    // // poll data
    // useInterval(() => {
    //     console.log("polling landing data");
    //     getData();
    // }, mountedRef, refresh);

    return (
        <>
        <div id="landing-stats" className="container">
            <div className="row p-4">
            <h2 className="mb-4">Statistics</h2>
            
            <div className="col-12 align-items-center">
                { loading === OperationStatus.PENDING && <SpinnerNormal class="spinner-border dashboard-spinner mb-4" /> }
                
                { loading === OperationStatus.COMPLETE && 

                <>
                <div className="row pb-3 mx-auto justify-content-center">
                    <div className="d-block landing-stats-card">
                        <h3>EST. Realtime APR</h3>
                        <span>{landingStats.estRealtimeAPY}%</span>
                    </div>
                    <div className="d-block landing-stats-card">
                        <h3>Circulating Supply Staked</h3>
                        <span>{landingStats.circulatingSupplyStake}%</span>
                    </div>
                    <div className="d-block landing-stats-card">
                        <h3>Remaining GZIL Available</h3>
                        <span>{landingStats.remainingGzil}%</span>
                    </div>

                    <div className="w-100"></div>
                    
                    <div className="d-block landing-stats-card">
                        <h3>Delegators / Staked Seed Nodes</h3>
                        <span>{landingStats.delegNum} / {landingStats.nodesNum}</span>
                    </div>
                    <div className="d-block landing-stats-card">
                        <h3>Stake Amount</h3>
                        <span>{convertQaToCommaStr(landingStats.totalDeposits)}</span>
                    </div>

                    <div className="d-block landing-stats-card">
                        <h3>Total GZIL minted</h3>
                        <span>{convertGzilToCommaStr(landingStats.gzil)}</span>
                    </div>
                </div>
                </>

                }

            </div>
            </div>
        </div>
        </>
    );
}

export default LandingStatsTable;