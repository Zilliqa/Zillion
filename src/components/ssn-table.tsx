import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactTooltip from "react-tooltip";
import { useTable, useSortBy } from 'react-table';
import { trackPromise } from 'react-promise-tracker';

import { PromiseArea, SsnStatus, Role } from '../util/enum';
import { convertToProperCommRate, convertQaToCommaStr, computeStakeAmtPercent, getAddressLink, getTruncatedAddress } from '../util/utils';
import * as Account from "../account";
import Spinner from './spinner';

import { BN, units } from '@zilliqa-js/util';
import { toBech32Address } from '@zilliqa-js/crypto';


function Table({ columns, data, tableId, hiddenColumns }: any) {
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
            initialState: { 
                pageIndex: 0, 
                hiddenColumns: hiddenColumns,
                sortBy: [
                    {
                        id: 'ssnStakeAmt',
                        desc: true
                    }
                ] 
            }
        }, useSortBy);
    
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

function SsnTable(props: any) {
    const proxy = props.proxy;
    const networkURL = props.network;
    const refresh = props.refresh ? props.refresh : 3000;
    const role = props.currRole;
    
    const [data, setData] = useState([] as any);
    const [totalStakeAmount, setTotalStakeAmount] = useState('');
    const [showSpinner, setShowSpinner] = useState(false);
    
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
                accessor: 'ssnAddress',
                className: 'ssn-address',
                Cell: ({ row }: any) => 
                    <>
                    <a data-tip={row.original.ssnAddress} href={getAddressLink(row.original.ssnAddress, networkURL)} target="_blank" rel="noopener noreferrer">
                        {getTruncatedAddress(row.original.ssnAddress)}
                    </a>
                    <ReactTooltip place="bottom" type="dark" effect="float" />
                    </>
            },
            {
                Header: 'api endpoint',
                accessor: 'ssnApiURL',
                Cell: ({ row }: any) => <span className="ssn-table-api-url">{row.original.ssnApiURL}</span>
            },
            {
                Header: 'stake amount (ZIL)',
                accessor: 'ssnStakeAmt',
                Cell: ({ row }: any) => 
                    <>
                    <span>{convertQaToCommaStr(row.original.ssnStakeAmt)} ({computeStakeAmtPercent(row.original.ssnStakeAmt, totalStakeAmount).toFixed(2)}&#37;)</span>
                    </>
            },
            {
                Header: 'buffered deposit (ZIL)',
                accessor: 'ssnBufferedDeposit',
                Cell: ({ row }: any) =>
                    <>
                    <span>{convertQaToCommaStr(row.original.ssnBufferedDeposit)}</span>
                    </>
            },
            {
                Header: 'Comm. Rate (%)',
                accessor: 'ssnCommRate',
                Cell: ({ row }: any) =>
                    <span>{convertToProperCommRate(row.original.ssnCommRate).toFixed(2)}</span>
            },
            {
                Header: 'Comm. Reward (ZIL)',
                accessor: 'ssnCommReward',
                Cell: ({ row }: any) => 
                    <span className="ssn-table-comm-reward">{convertQaToCommaStr(row.original.ssnCommReward)}</span>
            },
            {
                Header: 'Delegators',
                accessor: 'ssnDeleg'
            },
            {
                Header: 'Status',
                accessor: 'ssnStatus',
                Cell: ({ row }: any) => 
                        <>
                        <div className={ row.original.ssnStatus === SsnStatus.ACTIVE ? 'px-2 py-1 rounded ssn-table-status-active' : 'px-2 py-1 rounded ssn-table-status-inactive' }>
                            {row.original.ssnStatus}
                        </div>
                        </>
            }
            // eslint-disable-next-line
        ],[totalStakeAmount, role]
    )

    const getHiddenColumns = () => {
        // hide redudant info for certain group of users, e.g. commission reward
        // list the hidden column accessor names
        let hiddenColumns = [];
        if (role !== undefined && role === Role.DELEGATOR) {
            hiddenColumns.push("ssnCommReward");
        }
        return hiddenColumns;
    }
    
    const getData = async () => {
        let outputResult: { ssnAddress: string; ssnName: any; ssnStakeAmt: string; ssnBufferedDeposit: string; ssnCommRate: any; ssnCommReward: string; ssnDeleg: number; }[] = [];

        trackPromise(Account.getSsnImplContract(proxy, networkURL).then((implContract) => {
            if (implContract === 'error') {
                setData([]);
                return null;
            }

            // get total stake amount
            if (implContract.hasOwnProperty('totalstakeamount')) {
                console.log();
                setTotalStakeAmount(implContract.totalstakeamount);
            }

            // get node operator details
            for (const key in implContract.ssnlist) {
                if (implContract.ssnlist.hasOwnProperty(key) && key.startsWith("0x")) {
                    let delegAmt = 0;
                    let status = SsnStatus.INACTIVE;
                    const ssnArgs = implContract.ssnlist[key].arguments;

                    // get ssn status
                    if (ssnArgs[0].constructor === 'True') {
                        status = SsnStatus.ACTIVE;
                    }

                    // get number of delegators
                    if (implContract.hasOwnProperty("ssn_deleg_amt") && implContract.ssn_deleg_amt.hasOwnProperty(key)) {
                        delegAmt = Object.keys(implContract.ssn_deleg_amt[key]).length;
                    }

                    const nodeJson = {
                        ssnAddress: toBech32Address(key),
                        ssnName: ssnArgs[3],
                        ssnApiURL: ssnArgs[5],
                        ssnStakeAmt: ssnArgs[1],
                        ssnBufferedDeposit: units.fromQa(new BN(ssnArgs[6]), units.Units.Zil),
                        ssnCommRate: ssnArgs[7],
                        ssnCommReward: ssnArgs[8],
                        ssnDeleg: delegAmt,
                        ssnStatus: status
                    }
                    outputResult.push(nodeJson);
                }
            }

            if (mountedRef.current) {
                setData([...outputResult]);
            }
            
            // console.log("data: %o", data);
        }), PromiseArea.PROMISE_GET_CONTRACT);
    };

    useEffect(() => {
        setShowSpinner(true);
        getData();
        // eslint-disable-next-line
    }, [proxy, networkURL]);

    useEffect(() => {
        mountedRef.current = true;
        const intervalId = setInterval(async () => {
            console.log("refreshing");
            setShowSpinner(false);
            await getData();
        }, refresh);
        return () => {
            clearInterval(intervalId);
            mountedRef.current = false;
        }
        // eslint-disable-next-line
    });

    return (
        <>
        { showSpinner && <Spinner class="spinner-border dashboard-spinner" area={PromiseArea.PROMISE_GET_CONTRACT} /> }
        <Table columns={columns} data={data} className={props.tableId} hiddenColumns={getHiddenColumns()}></Table>
        </>
    );
}

export default SsnTable;
