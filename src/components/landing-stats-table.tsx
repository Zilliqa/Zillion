import React, { useState, useRef, useEffect } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { PromiseArea, OperationStatus } from '../util/enum';
import { convertZilToQa, convertQaToCommaStr } from '../util/utils';

import Spinner from './spinner';

const { BN, units } = require('@zilliqa-js/util');
const BigNumber = require('bignumber.js');

const MAX_GZIL_SUPPLY = "682550";
const TOTAL_REWARD_SEED_NODES = "1870000"; // 110000 * 17

function LandingStatsTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : 3000;
    const [showSpinner, setShowSpinner] = useState(false);

    const [data, setData] = useState({
        circulatingSupplyStake: '0',
        nodesNum: '0',
        delegNum: '0',
        gzil: '0',
        remainingGzil: '0',
        totalDeposits: '0',
        estRealtimeAPY: '0'
    });

    const mountedRef = useRef(false);

    const getData = () => {
        let circulatingSupplyStake = '0';
        let gzil = '0';
        let remainingGzil = '0';

        trackPromise(ZilliqaAccount.getSsnImplContract(proxy, networkURL)
            .then(async (contract) => {
                
            if (contract === undefined || contract === 'error') {
                return null;
            }

            // compute circulating supply
            const totalCoinSupply = await ZilliqaAccount.getTotalCoinSupply(proxy);
            const totalStakeAmount = contract.totalstakeamount;

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
            let estAPY = new BigNumber(0);

            if (!temp.isEqualTo(0)) {
                estAPY = new BigNumber(convertZilToQa(TOTAL_REWARD_SEED_NODES)).dividedBy(temp).toFixed(5);
            }

            if (mountedRef.current) {
                setData(prevData => ({
                    ...prevData,
                    circulatingSupplyStake: circulatingSupplyStake.toString(),
                    nodesNum: Object.keys(contract.ssnlist).length.toString(),
                    delegNum: Object.keys(contract.deposit_amt_deleg).length.toString(),
                    gzil: gzil,
                    remainingGzil: remainingGzil.toString(),
                    totalDeposits: totalStakeAmount.toString(),
                    estRealtimeAPY: estAPY.toString(),
                }));
            }

            }), PromiseArea.PROMISE_LANDING_STATS);
        
    }

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
        <div id="landing-stats" className="container">
            <div className="row p-4">
            <h2 className="mb-4">Statistics</h2>
            
            <div className="col-12 align-items-center">
                { showSpinner && <Spinner class="spinner-border dashboard-spinner mb-4" area={PromiseArea.PROMISE_LANDING_STATS} /> }
                
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