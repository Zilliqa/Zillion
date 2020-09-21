import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTable } from 'react-table';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from "../account";
import { computeDelegRewards } from '../util/reward-calculator'
import { PromiseArea, Constants } from '../util/enum';
import { convertQaToCommaStr, getAddressLink } from '../util/utils';
import { useInterval } from '../util/use-interval';
import SpinnerNormal from './spinner-normal';

import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';

const { BN } = require('@zilliqa-js/util');


function Table({ columns, data }: any) {
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = useTable(
        {
            columns,
            data
        });
    
    return (
        <table className="table" {...getTableProps()}>
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

function StakingPortfolio(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : Constants.REFRESH_RATE;

    const [showSpinner, setShowSpinner] = useState(true);
    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();
    const [portfolioTable, setPortfolioTable] = useState([] as any);

    // prevent react update state on unmounted component 
    const mountedRef = useRef(true);

    const columns = useMemo(
        () => [
            {
                Header: 'name',
                accessor: 'ssnName',
            },
            {
                Header: 'address',
                accessor: 'ssnAddress',
                Cell: ({ row }: any) => <a href={getAddressLink(row.original.ssnAddress, networkURL)} target="_blank" rel="noopener noreferrer">{row.original.ssnAddress}</a>
            },
            {
                Header: 'deposit (ZIL)',
                accessor: 'delegAmt',
                Cell: ({ row }: any) => <span>{convertQaToCommaStr(row.original.delegAmt)}</span>
            },
            {
                Header: 'rewards (ZIL)',
                accessor: 'rewards',
                Cell: ({ row }: any) => <span>{convertQaToCommaStr(row.original.rewards)}</span>
            }
        ], [networkURL]
    );

    const getData = useCallback(() => {
        let outputResult: { ssnName: string; ssnAddress: string; delegAmt: string; rewards: string; }[] = [];

        trackPromise(ZilliqaAccount.getSsnImplContractDirect(proxy, networkURL)
            .then(async (contract) => {
                if (contract === undefined || contract === 'error') {
                    return null;
                }
        
                if (contract.hasOwnProperty('deposit_amt_deleg') && contract.deposit_amt_deleg.hasOwnProperty(userBase16Address)) {
                    const depositDelegList = contract.deposit_amt_deleg[userBase16Address];
                    for (const ssnAddress in depositDelegList) {
                        if (!depositDelegList.hasOwnProperty(ssnAddress)) {
                            continue;
                        }

                        // compute stake amount
                        const delegAmt = new BN(depositDelegList[ssnAddress]);

                        // compute rewards
                        const delegRewards = new BN(await computeDelegRewards(proxy, networkURL, ssnAddress, userBase16Address)).toString();

                        const portfolioData = {
                            ssnName: contract.ssnlist[ssnAddress].arguments[3],
                            ssnAddress: toBech32Address(ssnAddress),
                            delegAmt: delegAmt.toString(),
                            rewards: delegRewards.toString()
                        }

                        outputResult.push(portfolioData);
                    }
                }

            })
            .finally(() => {

                if (!mountedRef.current) {
                    return null;
                }

                setShowSpinner(false);

                if (mountedRef.current) {
                    console.log('updating delegator portfolio...');
                    setPortfolioTable([...outputResult]);
                }

            }), PromiseArea.PROMISE_GET_STAKE_PORTFOLIO);

    }, [proxy, networkURL, userBase16Address]);

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
        { showSpinner && <SpinnerNormal class="spinner-border dashboard-spinner" /> }
        { portfolioTable.length === 0 && <div className="d-block text-left"><em>You have not deposited in any nodes yet.</em></div> }
        { portfolioTable.length > 0 && <Table columns={columns} data={portfolioTable} /> }
        </>
    );
}

export default StakingPortfolio;