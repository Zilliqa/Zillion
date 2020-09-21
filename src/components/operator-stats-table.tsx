import React, { useState, useRef, useEffect, useCallback } from 'react';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../account';
import { PromiseArea, Constants } from '../util/enum';

import { useInterval } from '../util/use-interval';
import SpinnerNormal from './spinner-normal';
import { convertQaToCommaStr, convertToProperCommRate } from '../util/utils';

import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';


function OperatorStatsTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : Constants.REFRESH_RATE;

    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

    // set parent node details information
    const setNodeDetails = props.setParentNodeDetails;

    const [showSpinner, setShowSpinner] = useState(true);

    const [data, setData] = useState({
        stakeAmount: '0',
        bufferedDeposit: '0',
        commRate: '0',
        commReward: '0',
        delegNum: '0',
    });

    const mountedRef = useRef(true);

    const getData = useCallback(() => {
        let name = '';
        let stakeAmount = '0';
        let bufferedDeposit = '0';
        let delegNum = '0';
        let commRate = '0';
        let commReward = '0';
        let receiver = '';

        trackPromise(ZilliqaAccount.getSsnImplContractDirect(proxy, networkURL)
            .then((contract) => {

                if (contract === undefined || contract === 'error') {
                    return null;
                }

                if (contract.hasOwnProperty('ssnlist') && contract.ssnlist.hasOwnProperty(userBase16Address)) {
                    const ssnArgs = contract.ssnlist[userBase16Address].arguments;

                    // get number of delegators
                    if (contract.hasOwnProperty("ssn_deleg_amt") && contract.ssn_deleg_amt.hasOwnProperty(userBase16Address)) {
                        delegNum = Object.keys(contract.ssn_deleg_amt[userBase16Address]).length.toString();
                    }

                    name = ssnArgs[3];
                    stakeAmount = ssnArgs[1];
                    bufferedDeposit = ssnArgs[6];
                    commRate = ssnArgs[7];
                    commReward = ssnArgs[8];
                    receiver = toBech32Address(ssnArgs[9])
                }

            })
            .finally(() => {

                if(!mountedRef.current) {
                    return null;
                }

                setShowSpinner(false);

                if (mountedRef.current) {
                    console.log("updating operator stats...");
                    setData(prevData => ({
                        ...prevData,
                        stakeAmount: stakeAmount,
                        bufferedDeposit: bufferedDeposit,
                        commRate: commRate,
                        commReward: commReward,
                        delegNum: delegNum,
                    }));

                    setNodeDetails((prevNodeDetails: any) => ({
                        ...prevNodeDetails,
                        name: name,
                        stakeAmount: stakeAmount,
                        bufferedDeposit: bufferedDeposit,
                        commRate: commRate,
                        commReward: commReward,
                        delegNum: delegNum,
                        receiver: receiver,
                    }));
                }

            }), PromiseArea.PROMISE_GET_OPERATOR_STATS);

    }, [proxy, networkURL, userBase16Address, setNodeDetails]);

    // load initial data
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
        { showSpinner && <SpinnerNormal class="spinner-border dashboard-spinner mb-4" /> }

        { !showSpinner &&

        <>
        <div className="row px-2 align-items-center justify-content-center">
            <div className="d-block operator-stats-card">
                <h3>Stake Amount</h3>
                <span>{convertQaToCommaStr(data.stakeAmount)}</span>
            </div>
            <div className="d-block operator-stats-card">
                <h3>Buffered Deposit</h3>
                <span>{convertQaToCommaStr(data.bufferedDeposit)}</span>
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

        }

        </>
        
    );
}

export default OperatorStatsTable;