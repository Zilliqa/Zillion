import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { useTable, useSortBy } from 'react-table';

import { Constants, PromiseArea } from '../util/enum';
import { useInterval } from '../util/use-interval';
import { convertQaToCommaStr } from '../util/utils';

import { fromBech32Address } from '@zilliqa-js/crypto';
import * as ZilliqaAccount from '../account';
import SpinnerNormal from './spinner-normal';
import IconQuestionCircle from './icons/question-circle';

const BigNumber = require('bignumber.js');


function Table({ columns, data, tableId }: any) {
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = useTable(
        {
            columns, 
            data,
            initialState : {
                sortBy: [
                    {
                        id: "blkNumCheck",
                        desc: false
                    }
                ]
            }
        }, useSortBy);

    return (
        <table id={tableId} className="table" {...getTableProps()}>
            <thead>
                {headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            <th scope="col" {...column.getHeaderProps()}>{column.render('Header')}</th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody {...getTableBodyProps()}>
                {rows.map((row, i) => {
                    prepareRow(row)
                    return (
                        <tr {...row.getRowProps()}>
                            {row.cells.map(cell => {
                                return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                            })}
                        </tr>
                    )
                })}
            </tbody>
        </table>
    );
}

function CompleteWithdrawalTable(props: any) {
    const impl = props.impl;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : Constants.REFRESH_RATE;

    const [showSpinner, setShowSpinner] = useState(true);
    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

    const [data, setData] = useState([] as any);
    const [totalClaimableAmt, setTotalClaimableAmt] = useState('0');

    const mountedRef = useRef(true);

    const columns = useMemo(
        () => [
            {
                Header: 'block num required',
                accessor: 'blkNumCheck'
            },
            {
                Header: 'block num countdown',
                accessor: 'blkNumCountdown'
            },
            {
                Header: 'amount (ZIL)',
                accessor: 'amount',
                Cell: ({ row }: any) => <span>{convertQaToCommaStr(row.original.amount)}</span>
            },
            {
                Header: 'progress',
                accessor: 'progress',
                Cell: ({ row }: any) => <span>{row.original.progress}%</span>
            }
        ], []
    );

    const getData = useCallback(() => {
        let outputResult: { amount: string, blkNumCountdown: string, blkNumCheck: string, progress: string }[] = [];
        let totalClaimableAmtBN = new BigNumber(0); // Qa
        let progress = '0';

        trackPromise(ZilliqaAccount.getSsnImplContractDirect(impl, networkURL)
            .then(async (contract) => {

                if (contract === undefined || contract === "error") {
                    return null;
                }

                if (contract.withdrawal_pending.hasOwnProperty(userBase16Address)) {
                    // deleg has pending withdrawals
                    const blkNumAmtMap = contract.withdrawal_pending[userBase16Address];
                    const blkNumReq = contract.bnum_req;

                    const currentBlkNum = new BigNumber(await ZilliqaAccount.getNumTxBlocks()).minus(1);

                    console.log("complete withdraw bnum req: %o", blkNumReq);

                    for (const blkNum in blkNumAmtMap) {
                        if (!blkNumAmtMap.hasOwnProperty(blkNum)) {
                            continue;
                        }

                        console.log("complete withdraw blkNum: %o", blkNum);

                        const amount = blkNumAmtMap[blkNum];
                        let blkNumCheck = new BigNumber(blkNum).plus(blkNumReq);
                        let blkNumCountdown = blkNumCheck.minus(currentBlkNum); // may be negative
                        let completed = new BigNumber(0);

                        // compute progress using blk num countdown ratio
                        if (blkNumCountdown.isLessThanOrEqualTo(0)) {
                            // can withdraw
                            totalClaimableAmtBN = totalClaimableAmtBN.plus(new BigNumber(amount));
                            blkNumCountdown = new BigNumber(0);
                            completed = new BigNumber(1);
                        } else {
                            // still have pending blks
                            // 1 - (countdown/blk_req)
                            const processed = blkNumCountdown.dividedBy(blkNumReq);
                            completed = new BigNumber(1).minus(processed);
                        }

                        console.log("complete withdraw currentblknum: %o", currentBlkNum.toString());
                        console.log("complete withdraw blkNumCheck: %o", blkNumCheck.toString());
                        console.log("complete withdraw blkNumcountdown: %o", blkNumCountdown.toString());
                        console.log("complete withdraw completed: %o", completed.toString());

                        // convert progress to percentage
                        progress = completed.times(100).toFixed(2);

                        // record the data
                        outputResult.push({
                            amount: amount.toString(),
                            blkNumCountdown: blkNumCountdown.toString(),
                            blkNumCheck: blkNumCheck.toString(),
                            progress: progress.toString(),
                        });
                    }
                }

            })
            .finally(() => {
                if (mountedRef.current) {
                    setShowSpinner(false);
                    setData([...outputResult]);
                    setTotalClaimableAmt(totalClaimableAmtBN.toString());
                }
            }), PromiseArea.PROMISE_GET_PENDING_WITHDRAWAL);


    }, [impl, networkURL, userBase16Address]);

    // load initial data
    useEffect(() => {
        getData();
        return () => {
            mountedRef.current = false;
        };
    }, [getData])

    // poll data
    useInterval(() => {
        getData();
    }, mountedRef, refresh);

    return (
        <>
        
        <div id="complete-withdraw-accordion">
            <div className="card">
                <h6 className="inner-section-heading px-4 pt-4">Withdrawals&nbsp;
                    <span data-tip data-for="withdraw-question">
                        <IconQuestionCircle width="16" height="16" className="section-icon" />
                    </span>
                </h6>
                <div className="align-items-center">{ showSpinner && <SpinnerNormal class="spinner-border dashboard-spinner" /> }</div>
                <div className="card-header d-flex justify-content-between pb-4" id="complete-withdraw-accordion-header">
                    <div>
                        <span><em>You have a claimable stake amount of <strong>{convertQaToCommaStr(totalClaimableAmt)}</strong> ZIL</em></span>
                    </div>
                    <div className="btn-group">
                        { data.length !== 0 && <button className="btn btn-inner-contract mr-4" data-toggle="modal" data-target="#complete-withdrawal-modal" data-keyboard="false" data-backdrop="static">Claim Stakes</button> }
                        { data.length !== 0 && <button className="btn btn-user-action mr-4" data-toggle="collapse" data-target="#complete-withdraw-details" aria-expanded="true" aria-controls="complete-withdraw-details">View Details</button> }
                    </div>
                </div>

                <div id="complete-withdraw-details" className="collapse" aria-labelledby="complete-withdraw-accordion-header" data-parent="#complete-withdraw-accordion">
                    <div className="card-body">
                        { data.length === 0 && <em>You have no amount ready for withdrawal yet.</em> }
                        <Table columns={columns} data={data} />
                    </div>
                </div>

            </div>
        </div>

        </>
    )

}

export default CompleteWithdrawalTable;