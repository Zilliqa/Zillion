import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { useTable, useSortBy } from 'react-table';

import { Constants, PromiseArea } from '../util/enum';
import { useInterval } from '../util/use-interval';
import { convertQaToCommaStr } from '../util/utils';

import { fromBech32Address } from '@zilliqa-js/crypto';
import * as ZilliqaAccount from '../account';

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
                        let blkNumCountdown = blkNumCheck.minus(currentBlkNum);
                        let completed = new BigNumber(0);

                        completed = currentBlkNum.dividedBy(blkNumCheck);

                        console.log("complete withdraw currentblknum: %o", currentBlkNum.toString());
                        console.log("complete withdraw blkNumCheck: %o", blkNumCheck.toString());
                        console.log("complete withdraw blkNumcountdown: %o", blkNumCountdown.toString());
                        console.log("complete withdraw completed: %o", completed.toString());

                        // compute total amount that can be withdraw
                        if (completed.isGreaterThanOrEqualTo(1)) {
                            // can withdraw
                            totalClaimableAmtBN = totalClaimableAmtBN.plus(new BigNumber(amount));
                            blkNumCountdown = new BigNumber(0);
                            completed = new BigNumber(1);
                        }

                        // convert progress
                        progress = completed.times(100).toFixed(2)

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
                    setData([...outputResult]);
                    setTotalClaimableAmt(totalClaimableAmtBN.toString());
                }
            }), PromiseArea.PROMISE_GET_PENDING_WITHDRAWAL);


    }, [impl, networkURL, userBase16Address]);

    // load initial data
    useEffect(() => {
        getData();
    }, [getData])

    // poll data
    useInterval(() => {
        getData();
    }, mountedRef, refresh);

    return (
        <>

        <div id="complete-withdraw-accordion">
            <div className="card">

                <div className="card-header d-flex justify-content-between" id="complete-withdraw-accordion-header">
                    <h2 className="mt-3">Claimable Stake Amount: {convertQaToCommaStr(totalClaimableAmt)} ZIL</h2>
                </div>
                <div>
                    { totalClaimableAmt !== '0' && <button className="btn btn-contract mr-4" data-toggle="modal" data-target="#complete-withdrawal-modal" data-keyboard="false" data-backdrop="static">Complete Withdrawal</button> }
                    <button className="btn btn-user-action mr-4" data-toggle="collapse" data-target="#complete-withdraw-details" aria-expanded="true" aria-controls="complete-withdraw-details">View Details</button>
                </div>

                <div id="complete-withdraw-details" className="collapse" aria-labelledby="complete-withdraw-accordion-header" data-parent="#complete-withdraw-accordion">
                    <div className="card-body">
                        { totalClaimableAmt === '0' && <em>You have no amount ready for withdrawal yet.</em> }
                        <Table columns={columns} data={data} />
                    </div>
                </div>

            </div>
        </div>

        </>
    )

}

export default CompleteWithdrawalTable;