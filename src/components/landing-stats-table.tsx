import React, { useState, useRef, useEffect } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { PromiseArea, OperationStatus } from '../util/enum';
import { convertZilToQa } from '../util/utils';

const BigNumber = require('bignumber.js');


function LandingStatsTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : 3000;

    const [data, setData] = useState({
        circulatingSupplyStake: '0',
        nodesNum: '0',
        delegNum: '0',
        gzil: '0',
        remaingGzil: '0'
    });

    const mountedRef = useRef(false);

    const getData = () => {
        let circulatingSupplyStake = '0';

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
                console.log("landing.....%o", totalCoinSupplyBN);
                console.log("landing.....%o", totalStakeAmountBN);
                circulatingSupplyStake = (totalStakeAmountBN.dividedBy(totalCoinSupplyBN)).times(100).toFixed(5);
                console.log(circulatingSupplyStake.toString());
            }


            setData(prevData => ({
                ...prevData,
                circulatingSupplyStake: circulatingSupplyStake.toString(),
                nodesNum: '0',
                delegNum: '0',
                gzil: '0',
                remaingGzil: '0'
            }));

            }), PromiseArea.PROMISE_GET_STAKE_PORTFOLIO);
        
    }

    useEffect(() => {
        getData();
    }, []);

    return (
        <div id="landing-stats" className="container">
            <div className="row p-4">
            <h2 className="mb-4">Statistics</h2>
            
            <div className="col-12">
                <div className="row pl-4 align-items-center justify-content-left">
                <div className="d-block landing-stats-card">
                    <h3>Circulating Supply Staked</h3>
                    <span>{data.circulatingSupplyStake}%</span>
                </div>
                <div className="d-block landing-stats-card">
                    <h3>Staked Seed Nodes</h3>
                    <span>10</span>
                </div>
                <div className="d-block landing-stats-card">
                    <h3>Delegators</h3>
                    <span>10</span>
                </div>
                </div>

                <div className="row pl-4 align-items-center justify-content-left">
                <div className="d-block landing-stats-card">
                    <h3>Total Number of GZIL minted</h3>
                    <span>10</span>
                </div>
                <div className="d-block landing-stats-card">
                    <h3>Remaining GZIL</h3>
                    <span>10%</span>
                </div>
                </div>

            </div>
            </div>
      </div>
    );
}

export default LandingStatsTable;