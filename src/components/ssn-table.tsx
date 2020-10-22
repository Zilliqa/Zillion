import React, { useMemo } from 'react';
import ReactTooltip from "react-tooltip";
import { useTable, useSortBy } from 'react-table';

import { PromiseArea, SsnStatus, Role, ContractState } from '../util/enum';
import { convertToProperCommRate, convertQaToCommaStr, computeStakeAmtPercent, getAddressLink, getTruncatedAddress } from '../util/utils';
import { SsnStats, DelegateStakeModalData } from '../util/interface';
import Spinner from './spinner';


function Table({ columns, data, tableId, hiddenColumns, showStakeBtn }: any) {
    // showStakeBtn is true means displaying for delegators
    // for delegators view, don't sort by stake amount

    let tempInitialState = {};

    if (showStakeBtn) {
        // deleg view
        // don't sort by stake amount to prevent users from staking the top most everytime
        tempInitialState = {
            pageIndex: 0, 
            hiddenColumns: hiddenColumns,
            sortBy: [
                {
                    id: 'name',
                    desc: false
                }
            ] 
        }
    } else {
        // default sort by stake amt
        tempInitialState = {
            pageIndex: 0, 
            hiddenColumns: hiddenColumns,
            sortBy: [
                {
                    id: 'stakeAmt',
                    desc: true
                }
            ] 
        }
    }

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
            initialState: tempInitialState
        }, useSortBy);
    
    return (
        <table id={tableId} className="table table-responsive-lg " {...getTableProps()}>
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
    const showStakeBtn = props.showStakeBtn ? props.showStakeBtn : false; // for deleg
    const setDelegStakeModalData = props.setDelegStakeModalData;

    const handleStake = (name: string, address: string, commRate: string) => {
        // set dashboard state variable
        setDelegStakeModalData((prevData: DelegateStakeModalData) => ({
            ...prevData,
            ssnName: name,
            ssnAddress: address,
            commRate: commRate,
        }));
    }

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
                            {
                                row.original.status === SsnStatus.INACTIVE ?
                                <>Below<br/>Min. Stake</> :
                                row.original.status
                            }
                        </div>
                        </>
            },
            {
                Header: 'Stake',
                accessor: 'stake',
                Cell: ({ row }: any) =>
                    <>
                    <button 
                        type="button" 
                        className="btn btn-contract-small shadow-none" 
                        data-toggle="modal" 
                        data-target="#delegate-stake-modal" 
                        data-keyboard="false" 
                        data-backdrop="static"
                        onClick={() => handleStake(row.original.name, row.original.address, row.original.commRate)}
                        disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false}>
                            Stake
                    </button>
                    </>
            }
            // eslint-disable-next-line
        ],[totalStakeAmt, role]
    )

    const getHiddenColumns = () => {
        // hide redudant info for certain group of users, e.g. commission reward
        // list the hidden column accessor names
        let hiddenColumns = [];
        if (role !== undefined && role === Role.DELEGATOR && ContractState.IS_PAUSED.toString() !== 'true') {
            hiddenColumns.push("commReward", "apiUrl");
        } else if (role !== undefined && role === Role.DELEGATOR && ContractState.IS_PAUSED.toString() === 'true') {
            // hide stake button if contract state is paused
            hiddenColumns.push("stake");
        }

        if (showStakeBtn === false || role === Role.OPERATOR) {
            hiddenColumns.push("stake");
        }
        return hiddenColumns;
    }
    
    return (
        <>
        <Spinner class="spinner-border dashboard-spinner mb-4" area={PromiseArea.PROMISE_GET_SSN_STATS} />
        <Table columns={columns} data={data} className={props.tableId} hiddenColumns={getHiddenColumns()} showStakeBtn={showStakeBtn} />
        </>
    );
}

export default SsnTable;
