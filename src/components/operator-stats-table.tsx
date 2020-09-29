import React from 'react';
import { convertQaToCommaStr, convertToProperCommRate } from '../util/utils';

import { OperatorStats } from '../util/interface';
import { PromiseArea } from '../util/enum';
import Spinner from './spinner';


function OperatorStatsTable(props: any) {
    const data: OperatorStats = props.data;

    return (
        <>
        <Spinner class="spinner-border dashboard-spinner mb-4" area={PromiseArea.PROMISE_GET_OPERATOR_STATS} />
        <div className="row px-2 align-items-center justify-content-center">
            <div className="d-block operator-stats-card">
                <h3>Stake Amount</h3>
                <span>{convertQaToCommaStr(data.stakeAmt)}</span>
            </div>
            <div className="d-block operator-stats-card">
                <h3>Buffered Deposit</h3>
                <span>{convertQaToCommaStr(data.bufferedDeposits)}</span>
            </div>
            <div className="d-block operator-stats-card">
                <h3>Delegators</h3>
                <span>{data.delegNum}</span>
            </div>
        </div>

        <div className="row px-2 pb-2 align-items-center justify-content-center">
            <div className="d-block operator-stats-card">
                <h3>Commission Rate</h3>
                <span>{convertToProperCommRate(data.commRate).toFixed(2)}%</span>
            </div>
            <div className="d-block operator-stats-card">
                <h3>Commission Rewards</h3>
                <span>{convertQaToCommaStr(data.commReward)}</span>
            </div>
            <div className="d-block operator-stats-card"></div>
        </div>

        </>
        
    );
}

export default OperatorStatsTable;