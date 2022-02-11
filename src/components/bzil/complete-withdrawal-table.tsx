import React, { useMemo } from 'react';
import { useSortBy, useTable } from 'react-table';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { UPDATE_SELECTED_VAULT_TO_WITHDRAW } from '../../store/userSlice';
import { ButtonText, ContractState } from '../../util/enum';
import { convertQaToCommaStr } from '../../util/utils';


function BzilCompleteWithdrawalTable(props: any) {
    const dispatch = useAppDispatch();
    const vaults = useAppSelector(state => state.user.vaults_pending_withdraw_list);
    const vaultsIdAddressMap = useAppSelector(state => state.user.vaults_id_address_map);

    const columns = useMemo(
        () => [
            {
                Header: 'pending blocks till claim',
                accessor: 'blkNumCountdown'
            },
            {
                Header: 'progress',
                accessor: 'progress',
                Cell: ({ row }: any) => <span>{row.original.progress}%</span>
            },
            {
                Header: 'amount (ZIL)',
                accessor: 'amount',
                Cell: ({ row }: any) => <span>{convertQaToCommaStr(row.original.amount)}</span>
            }
        ], []
    );

    const onSelectVault = (vaultId: number) => {
        // store the selected vaultid
        dispatch(UPDATE_SELECTED_VAULT_TO_WITHDRAW(vaultId));
        console.log("selected vault to withdraw: ", vaultId);
    }

    return (
        <div id="vault-pending-withdrawals" className="p-4 dashboard-card container-fluid">
            <div className="row">
                <div className="col">
                    <h5 className="card-title mb-4">Pending Withdrawals</h5>
                </div>
                <div className="col-12 mt-2 px-4 text-center">
                    <div className="inner-section">
                    {
                        vaults.map((vaultInfo, index) => {
                            return (
                                Object.entries(vaultInfo).map(([vaultId, pendingWithdrawLists]) => {
                                    return (
                                        <div key={index}>
                                            <div className="d-block px-4 py-2 pb-3 text-left">
                                                <div className="my-4">Vault: {vaultId}, Address: {vaultsIdAddressMap[vaultId]}</div>
                                                <div>
                                                    <button
                                                        className="btn btn-user-action" 
                                                        data-toggle="modal" 
                                                        data-target="#complete-withdrawal-modal" 
                                                        data-keyboard="false" 
                                                        data-backdrop="static"
                                                        disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false} 
                                                        onClick={() => onSelectVault(Number(vaultId))}
                                                    >
                                                        { ContractState.IS_PAUSED.toString() === 'true' ? ButtonText.NOT_AVAILABLE : 'Complete Stake Withdrawals' }
                                                    </button>
                                                </div>
                                            </div>
                                            <Table columns={columns} data={pendingWithdrawLists} />
                                        </div>
                                    )
                                })
                            )
                        })
                    }
                    </div>
                </div>
            </div>
        </div>
    );
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
            data,
            initialState : {
                sortBy: [
                    {
                        id: "blkNumCountdown",
                        desc: false
                    }
                ]
            }
        }, useSortBy);

    return (
        <table id={tableId} className="table table-responsive-lg" {...getTableProps()}>
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


export default BzilCompleteWithdrawalTable;