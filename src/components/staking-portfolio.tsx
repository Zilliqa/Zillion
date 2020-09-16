import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTable } from 'react-table';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from "../account";
import Spinner from './spinner';
import { computeDelegRewards } from '../util/reward-calculator'
import { PromiseArea } from '../util/enum';
import { convertQaToCommaStr, computeStakeAmtPercent } from '../util/utils';

import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
const { BN } = require('@zilliqa-js/util');

interface Portfolio {
    totalStakeDeposit: number,
    ssnStakeList: any[],
    totalRewards: number,
    ssnRewardsList: any[]
}

interface PortfolioData {
    ssnName: string,
    ssnAddress: string,
    delegAmt: string,
    rewards: string
}


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
            data
        });
    
    return (
        <table id={tableId} className="table table-responsive" {...getTableProps()}>
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
    const refresh = props.refresh ? props.refresh : 3000;

    const [showSpinner, setShowSpinner] = useState(false);
    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();
    const [data, setData] = useState({
            totalStakeDeposit: 0,
            ssnStakeList: 0,
            totalRewards: [],
            ssnRewardsList: [],
        } as unknown as Portfolio);
    const [portfolioTable, setPortfolioTable] = useState([] as any);

    // prevent react update state on unmounted component 
    const mountedRef = useRef(false);

    const columns = useMemo(
        () => [
            {
                Header: 'name',
                accessor: 'ssnName'
            },
            {
                Header: 'address',
                accessor: 'ssnAddress'
            },
            {
                Header: 'deposit',
                accessor: 'delegAmt'
            },
            {
                Header: 'rewards',
                accessor: 'rewards'
            }
        ], []
    );

    const getData = async () => {
        let totalStakeDeposit = 0;
        let totalRewards = 0;
        let ssnStakeList: any[] = [];
        let ssnRewardsList: any[] = [];

        let outputResult : PortfolioData[] = [];

        trackPromise(ZilliqaAccount.getSsnImplContract(proxy, networkURL)
            .then(async (contract) => {
                if (contract === undefined || contract === 'error') {
                    setPortfolioTable([]);
                    return null;
                }
        
                if (contract.hasOwnProperty('deposit_amt_deleg') && contract.deposit_amt_deleg.hasOwnProperty(userBase16Address)) {
                    const depositDelegList = contract.deposit_amt_deleg[userBase16Address];
                    for (const ssnAddress in depositDelegList) {
                        console.log("staking portfolio - got ssn address :%o", ssnAddress);
                        if (!depositDelegList.hasOwnProperty(ssnAddress)) {
                            continue;
                        }

                        // compute stake amount
                        const delegAmt = new BN(depositDelegList[ssnAddress]).toString();

                        // compute rewards
                        const delegRewards = new BN(await computeDelegRewards(proxy, networkURL, ssnAddress, userBase16Address)).toString();

                        const portfolioData : PortfolioData = {
                            ssnName: contract.ssnlist[ssnAddress].arguments[3],
                            ssnAddress: ssnAddress,
                            delegAmt: delegAmt,
                            rewards: delegRewards
                        }

                        outputResult.push(portfolioData);
                    }
                }

                if (mountedRef.current) {
                    setPortfolioTable([...outputResult]);
                }

            }), PromiseArea.PROMISE_GET_STAKE_PORTFOLIO);
    }

    useEffect(() => {
        setShowSpinner(true);
        getData();
        // eslint-disable-next-line
    }, [])

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
    }, [proxy, networkURL, userBase16Address]);

    return (
        <>
        { showSpinner && <Spinner class="spinner-border dashboard-spinner" area={PromiseArea.PROMISE_GET_STAKE_PORTFOLIO} /> }
        <Table columns={columns} data={portfolioTable} />
        </>
    );
}

export default StakingPortfolio;