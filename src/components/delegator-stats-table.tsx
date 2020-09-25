import React, { useState } from 'react';
import { PromiseArea, Constants } from '../util/enum';

import { fromBech32Address } from '@zilliqa-js/crypto';
import { convertQaToCommaStr, convertGzilToCommaStr } from '../util/utils';
import Spinner from './spinner';


const { BN } = require('@zilliqa-js/util');
const BigNumber = require('bignumber.js');


function DelegatorStatsTable(props: any) {
    const impl = props.impl;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : Constants.REFRESH_RATE;

    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

    const [showSpinner, setShowSpinner] = useState(true);

    const data = props.data;


    return (
        <>
        <Spinner class="spinner-border dashboard-spinner mb-4" area={PromiseArea.PROMISE_GET_DELEG_STATS} />
        <div className="row px-2 pb-3 align-items-center justify-content-center">
            <div className="d-block deleg-stats-card">
                <h3>Last Cycle APY</h3>
                <span>WIP</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Total Deposits</h3>
                <span>{convertQaToCommaStr(data.totalDeposits)}</span>
            </div>
            <div className="d-block deleg-stats-card">
                <h3>Pending Stake Withdrawal</h3>
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
        
        </>
    );
}

export default DelegatorStatsTable;