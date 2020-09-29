import React from 'react';
import { PromiseArea } from '../util/enum';

import { convertQaToCommaStr, convertGzilToCommaStr } from '../util/utils';
import Spinner from './spinner';


function DelegatorStatsTable(props: any) {
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