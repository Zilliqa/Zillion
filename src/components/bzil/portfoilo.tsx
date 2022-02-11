import React, { useMemo } from 'react';
import { useSortBy, useTable } from 'react-table';
import ReactTooltip from 'react-tooltip';
import { useAppSelector } from '../../store/hooks';
import { OperationStatus } from '../../util/enum';
import { convertQaToCommaStr, convertQaToZilFull } from '../../util/utils';
import DelegatorDropdown from '../delegator-dropdown';
import SpinnerNormal from '../spinner-normal';


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
        <table className="table table-responsive-sm" {...getTableProps()}>
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

function BzilPortfolio(props: any) {
    const vaults = useAppSelector(state => state.user.vaults);
    const vaultsBalances = useAppSelector(state => state.user.vaults_balances);  // vault_address -> { zilBalance, bzilBalance }
    const vaultsIdAddressMap = useAppSelector(state => state.user.vaults_id_address_map);
    const loading: OperationStatus = useAppSelector(state => state.user.is_deleg_stats_loading);


    const columns = useMemo(
        () => [
            {
                Header: 'name',
                accessor: 'ssnName',
            },
            {
                Header: 'deposit (ZIL)',
                accessor: 'delegAmt',
                Cell: ({ row }: any) => <span>{convertQaToCommaStr(row.original.delegAmt)}</span>
            },
            {
                Header: 'rewards (ZIL)',
                accessor: 'rewards',
                Cell: ({ row }: any) => 
                    <>
                    <span data-for="rewards-tip" data-tip={convertQaToZilFull(row.original.rewards)}>{convertQaToCommaStr(row.original.rewards)}</span>
                    <ReactTooltip id="rewards-tip" place="bottom" type="dark" effect="solid" />
                    </>
            },
            {
                Header: 'actions',
                accessor: 'actions',
                Cell: ({ row }: any) =>
                    <>
                    <DelegatorDropdown
                        ssnName={row.original.ssnName}
                        ssnAddress={row.original.ssnAddress}
                        delegAmt={row.original.delegAmt}
                        rewards={row.original.rewards}
                        vaultAddress={row.original.vaultAddress} 
                        vaultId={row.original.vaultId} />
                    </>
            }
        ], []
    );

    return (
        <>
        {
            loading === OperationStatus.PENDING &&
            <SpinnerNormal class="spinner-border dashboard-spinner mb-4" />
        }
        {
            loading === OperationStatus.COMPLETE &&
            Object.keys(vaults).length === 0 &&
            <div className="d-block px-4 pb-3 text-left"><em>You have not deposited in any nodes yet.</em></div>
        }
        {
            loading === OperationStatus.COMPLETE &&
            Object.keys(vaults).length > 0 &&
            vaults.map((vaultInfo, index) => {
                return (
                    Object.entries(vaultInfo).map(([vaultId, stakingLists]) => {
                        return (
                            <div key={index} className="mb-4">
                                <div className="d-block px-4 pb-3 text-left">Vault: {vaultId}, Address: {vaultsIdAddressMap[vaultId]}</div>
                                <div className="d-block px-4 pb-3 text-left">Vault ZIL Balance: {convertQaToCommaStr(vaultsBalances[vaultId]['zilBalance'])} ZIL</div>
                                <div className="d-block px-4 pb-3 text-left">Vault BZIL Minted: {convertQaToCommaStr(vaultsBalances[vaultId]['bzilBalance'])} BZIL</div>
                                <Table columns={columns} data={stakingLists} />
                            </div>
                        )
                    })
                )
            })
        }
        </>
    )
}

export default BzilPortfolio;