import React, { useMemo } from 'react';
import ReactTooltip from "react-tooltip";
import { useTable, useSortBy } from 'react-table';

import { PromiseArea, SsnStatus, Role } from '../util/enum';
import { convertToProperCommRate, convertQaToCommaStr, computeStakeAmtPercent, getAddressLink, getTruncatedAddress } from '../util/utils';
import { SsnStats } from '../util/interface';
import Spinner from './spinner';


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
                        id: 'stakeAmt',
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
    const networkURL = props.network;
    const role = props.currRole;
    
    const data: SsnStats[] = props.data;
    const totalStakeAmt = props.totalStakeAmt;

    const columns = useMemo(
        () => [
            {
                Header: 'name',
                accessor: 'name'
            },
            {
                Header: 'address',
                accessor: 'address',
                className: 'ssn-address',
                Cell: ({ row }: any) => 
                    <>
                    <a data-tip={row.original.address} href={getAddressLink(row.original.address, networkURL)} target="_blank" rel="noopener noreferrer">
                        {getTruncatedAddress(row.original.address)}
                    </a>
                    <ReactTooltip place="bottom" type="dark" effect="float" />
                    </>
            },
            {
                Header: 'api endpoint',
                accessor: 'apiUrl',
                Cell: ({ row }: any) => <span className="ssn-table-api-url">{row.original.apiUrl}</span>
            },
            {
                Header: 'stake amount (ZIL)',
                accessor: 'stakeAmt',
                Cell: ({ row }: any) => 
                    <>
                    <span>{convertQaToCommaStr(row.original.stakeAmt)} ({computeStakeAmtPercent(row.original.stakeAmt, totalStakeAmt).toFixed(2)}&#37;)</span>
                    </>
            },
            {
                Header: 'buffered deposit (ZIL)',
                accessor: 'bufferedDeposits',
                Cell: ({ row }: any) =>
                    <>
                    <span>{convertQaToCommaStr(row.original.bufferedDeposits)}</span>
                    </>
            },
            {
                Header: 'Comm. Rate (%)',
                accessor: 'commRate',
                Cell: ({ row }: any) =>
                    <span>{convertToProperCommRate(row.original.commRate).toFixed(2)}</span>
            },
            {
                Header: 'Comm. Reward (ZIL)',
                accessor: 'commReward',
                Cell: ({ row }: any) => 
                    <span className="ssn-table-comm-reward">{convertQaToCommaStr(row.original.commReward)}</span>
            },
            {
                Header: 'Delegators',
                accessor: 'delegNum'
            },
            {
                Header: 'Status',
                accessor: 'status',
                Cell: ({ row }: any) => 
                        <>
                        <div className={ row.original.status === SsnStatus.ACTIVE ? 'px-2 py-1 rounded ssn-table-status-active' : 'px-2 py-1 rounded ssn-table-status-inactive' }>
                            {row.original.status}
                        </div>
                        </>
            }
            // eslint-disable-next-line
        ],[totalStakeAmt, role]
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
    
    return (
        <>
        <Spinner class="spinner-border dashboard-spinner mb-4" area={PromiseArea.PROMISE_GET_SSN_STATS} />
        <Table columns={columns} data={data} className={props.tableId} hiddenColumns={getHiddenColumns()} />
        </>
    );
}

export default SsnTable;
