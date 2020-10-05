import React, { useMemo } from 'react';
import { useTable, useSortBy } from 'react-table';

import { PromiseArea } from '../util/enum';
import { convertQaToCommaStr, getAddressLink } from '../util/utils';

import { DelegStakingPortfolioStats } from '../util/interface';
import Spinner from './spinner';
import DelegatorDropdown from './delegator-dropdown';


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
            data,
            initialState : {
                pageIndex: 0,
                sortBy: [
                    {
                        id: 'delegAmt',
                        desc: true
                    }
                ]
            }
        }, useSortBy);
    
    return (
        <table className="table table-responsive-lg" {...getTableProps()}>
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
    const networkURL = props.network;
    const data: DelegStakingPortfolioStats[] = props.data;

    const { 
        setClaimedRewardModalData
     } = props;

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
            },
            {
                Header: 'actions',
                accessor: 'actions',
                Cell: ({ row }: any) =>
                    <>
                    <DelegatorDropdown
                        setClaimedRewardModalData={setClaimedRewardModalData}
                        ssnName={row.original.ssnName}
                        ssnAddress={row.original.ssnAddress}
                        rewards={row.original.rewards} />
                    </>
            }
        ], [networkURL, setClaimedRewardModalData]
    );

    return (
        <>
        <Spinner class="spinner-border dashboard-spinner mb-4" area={PromiseArea.PROMISE_GET_STAKE_PORTFOLIO} />
        { data.length === 0 && <div className="d-block px-4 pb-3 text-left"><em>You have not deposited in any nodes yet.</em></div> }
        { data.length > 0 && <Table columns={columns} data={data} /> }
        </>
    );
}

export default StakingPortfolio;