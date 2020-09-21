import React, { useState, useRef, useEffect, useCallback } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { Constants, PromiseArea, OperationStatus } from '../util/enum';
import { convertZilToQa, convertQaToCommaStr } from '../util/utils';
import { useInterval } from '../util/use-interval';
import SpinnerNormal from './spinner-normal';

const { BN, units } = require('@zilliqa-js/util');
const BigNumber = require('bignumber.js');

const MAX_GZIL_SUPPLY = Constants.MAX_GZIL_SUPPLY.toString();
const TOTAL_REWARD_SEED_NODES = Constants.TOTAL_REWARD_SEED_NODES.toString(); // 110000 * 17

function LandingStatsTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : Constants.REFRESH_RATE;
    const [showSpinner, setShowSpinner] = useState(true);
    const mountedRef = useRef(true);

    const [data, setData] = useState({
        circulatingSupplyStake: '0',
        nodesNum: '0',
        delegNum: '0',
        gzil: '0',
        remainingGzil: '0',
        totalDeposits: '0',
        estRealtimeAPY: '0'
    });

    const getData = useCallback(() => {
        let circulatingSupplyStake = '0';
        let nodesNum = '0';
        let delegNum = '0';
        let gzil = '0';
        let remainingGzil = '0';
        let totalDeposits = '0';
        let estAPY = new BigNumber(0);

        trackPromise(ZilliqaAccount.getSsnImplContract(proxy, networkURL)
            .then(async (contract) => {
                
                if (contract === undefined || contract === 'error') {
                    return null;
                }

                // compute number of nodes and delegators
                nodesNum = Object.keys(contract.ssnlist).length.toString();
                delegNum = Object.keys(contract.deposit_amt_deleg).length.toString();

                // compute circulating supply
                const totalCoinSupply = await ZilliqaAccount.getTotalCoinSupply(proxy);
                const totalStakeAmount = contract.totalstakeamount;
                totalDeposits = totalStakeAmount.toString();

                if (totalCoinSupply !== OperationStatus.ERROR && totalCoinSupply.result !== undefined) {
                    const totalCoinSupplyBN = new BigNumber(convertZilToQa(totalCoinSupply.result));
                    const totalStakeAmountBN = new BigNumber(totalStakeAmount);
                    circulatingSupplyStake = (totalStakeAmountBN.dividedBy(totalCoinSupplyBN)).times(100).toFixed(5);
                }

                // compute total number of gzil
                const gzilContract = await ZilliqaAccount.getGzilContract(contract.gziladdr);
                if (gzilContract !== undefined) {
                    gzil = (parseFloat(units.fromQa(new BN(gzilContract.total_supply), units.Units.Zil))/1000.00).toFixed(3);
                    const remainGzil = new BigNumber(convertZilToQa(MAX_GZIL_SUPPLY)).minus(new BigNumber(gzil));
                    remainingGzil = (remainGzil.dividedBy(new BigNumber(convertZilToQa(MAX_GZIL_SUPPLY)))).times(100).toFixed(2);
                }

                // compute est. APY
                let temp = new BigNumber(totalStakeAmount).times(36500);

                if (!temp.isEqualTo(0)) {
                    estAPY = new BigNumber(convertZilToQa(TOTAL_REWARD_SEED_NODES)).dividedBy(temp).toFixed(5);
                }
            })
            .finally(() => {

                if(!mountedRef.current) {
                    return null;
                }

                setShowSpinner(false);

                if (mountedRef.current) {
                    console.log("updating landing stats...");
                    setData(prevData => ({
                        ...prevData,
                        circulatingSupplyStake: circulatingSupplyStake.toString(),
                        nodesNum: nodesNum,
                        delegNum: delegNum,
                        gzil: gzil,
                        remainingGzil: remainingGzil.toString(),
                        totalDeposits: totalDeposits,
                        estRealtimeAPY: estAPY.toString(),
                    }));
                }
                
            }), PromiseArea.PROMISE_LANDING_STATS);
    }, [proxy, networkURL]);

    // load inital data
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
        <div id="landing-stats" className="container">
            <div className="row p-4">
            <h2 className="mb-4">Statistics</h2>
            
            <div className="col-12 align-items-center">
                { showSpinner && <SpinnerNormal class="spinner-border dashboard-spinner mb-4" /> }
                
                { !showSpinner && 

                <>
                <div className="row pb-3 mx-auto justify-content-center">
                    <div className="d-block landing-stats-card">
                        <h3>EST. Realtime APY</h3>
                        <span>{data.estRealtimeAPY}%</span>
                    </div>
                    <div className="d-block landing-stats-card">
                        <h3>Circulating Supply Staked</h3>
                        <span>{data.circulatingSupplyStake}%</span>
                    </div>
                    <div className="d-block landing-stats-card">
                        <h3>Remaining GZIL Available</h3>
                        <span>{data.remainingGzil}%</span>
                    </div>

                    <div className="w-100"></div>
                    
                    <div className="d-block landing-stats-card">
                        <h3>Delegators / Staked Seed Nodes</h3>
                        <span>{data.delegNum} / {data.nodesNum}</span>
                    </div>
                    <div className="d-block landing-stats-card">
                        <h3>Stake Amount</h3>
                        <span>{convertQaToCommaStr(data.totalDeposits)}</span>
                    </div>

                    <div className="d-block landing-stats-card">
                        <h3>Total GZIL minted</h3>
                        <span>{data.gzil}</span>
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