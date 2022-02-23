import React, { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { VaultDataMap } from '../../util/interface';
import { useSortBy, useTable } from 'react-table';
import ReactTooltip from 'react-tooltip';
import { convertQaToCommaStr, convertQaToZilFull } from '../../util/utils';
import DelegatorDropdown from '../delegator-dropdown';
import { OperationStatus } from '../../util/enum';
import SpinnerNormal from '../spinner-normal';


function Vaults(props: any) {
    const vaults = useAppSelector(state => state.user.vaults);
    const vaultsBalances = useAppSelector(state => state.user.vaults_balances);  // vault_address -> { zilBalance, bzilBalance }
    const vaultsDataMap: VaultDataMap = useAppSelector(state => state.user.vaults_data_map);
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
        <div id="vaults">
            {
                loading === OperationStatus.PENDING &&
                <SpinnerNormal class="spinner-border dashboard-spinner mb-4" />
            }
            {
                loading === OperationStatus.COMPLETE &&
                vaults.map((vaultInfo, index) => {
                    return (
                        Object.entries(vaultInfo).map(([vaultId, stakingLists]) => {
                            const _vaultId = Number(vaultId);
                            
                            return (
                                <div className="vault-info p-4 mb-4">
                                    <div className="vault-title mb-2">Vault <span className="ml-2">#{vaultId}</span></div>
                                    <div className="d-flex mb-4">
                                        <div className="stats mr-4">Address <span className="ml-2">{vaultsDataMap[_vaultId].vaultAddress}</span></div>
                                        <div className="stats mr-4">Balance <span className="ml-2">{convertQaToCommaStr(vaultsBalances[_vaultId]['zilBalance'])} ZIL</span></div>
                                        <div className="stats mr-4">Minted <span className="ml-2">{convertQaToCommaStr(vaultsBalances[_vaultId]['bzilBalance'])} BZIL</span></div>
                                    </div>
                                    <div className="text-center">
                                        <Table columns={columns} data={stakingLists} />
                                    </div>
                                </div>
                            )
                        })
                    )
                })
            }
        </div>
    );
}

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
        <table id="vault-table" className="table table-responsive-sm" {...getTableProps()}>
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

export default Vaults;