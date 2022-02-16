import React, { useMemo } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { useSortBy, useTable } from 'react-table';
import { useAppSelector } from '../../store/hooks';
import { ZilSigner } from '../../zilliqa-signer';
import { ZilTxParser } from '../../zilliqa-txparser';


/**
 * Dummy component to hold all the vault operations
 * while the UI is still in works
 * @TODO: modal txn id return for accept vault transfer
 */
function DummyVaultOpTable(props: any) {
    const vaultsIdAddressMap = useAppSelector(state => state.user.vaults_id_address_map);
    const vaultsTransferRequestList = useAppSelector(state => state.user.vaults_ownership_transfer_request_list);
    const vaultsTransferReceivedList = useAppSelector(state => state.user.vaults_ownership_transfer_received_list);
    const ledgerIndex = useAppSelector(state => state.user.ledger_index);
    const accountType = useAppSelector(state => state.user.account_type);

    const defaultGasPrice = ZilSigner.getDefaultGasPrice();
    const defaultGasLimit = ZilSigner.getDefaultGasLimit();
    
    const columns = useMemo(
        () => [
            {
                Header: 'vault id',
                accessor: 'vaultId',
            },
            {
                Header: 'vault address',
                accessor: 'vaultAddress',
                Cell: ({ row }: any) => <span>{vaultsIdAddressMap[row.original.vaultId]}</span>
            },
            {
                Header: 'Pending New Owner',
                accessor: 'initOwner',
            },
            {
                Header: 'Accept',
                accessor: 'accept',
                Cell: ({ row }: any) =>
                    <div>
                        <button
                            className="btn btn-user-action"
                            onClick={() => onAcceptVaultTransfer(row.original.initOwner, row.original.vaultId)}>
                            Accept
                        </button>
                    </div>
            }
        ], []
    );

    const onAcceptVaultTransfer = (owner: string, vaultId: number) => {
        let txParams = ZilTxParser.parseCompleteVaultTransfer(owner, vaultId, defaultGasPrice, defaultGasLimit);
        
        trackPromise(ZilSigner.sign(accountType, txParams, ledgerIndex)
            .then((result) => {
                console.log(result);
            })
        );
    }

    return (
        <div id="dummy-vault-op" className="p-4 dashboard-card container-fluid">
            <div className="row">
                <div className="col">
                    <h5 className="card-title mb-4">Vault Operations</h5>
                </div>
            </div>
            <div className="row mb-4">
                <div className="col">
                    <button
                        className="btn btn-user-action mr-auto"
                        data-toggle="modal"
                        data-target="#transfer-vault-modal">
                            Transfer Vault
                    </button>
                </div>
            </div>
            <div className="row mt-4">
                <div className="col">
                    <div className="mb-4">
                        <h5>Vault Transfer Request</h5>
                        {
                            vaultsTransferRequestList.length === 0

                            ?

                            <p>You have not made any vaults transfer request.</p>

                            :
                            
                            vaultsTransferRequestList.map((vaultsTransferData) => {
                                return (
                                    <div>
                                        <p>Vault Id: {vaultsTransferData.vaultId}</p>
                                        <p>Vault Address: {vaultsIdAddressMap[vaultsTransferData.vaultId]}</p>
                                        <p>Pending New Owner: {vaultsTransferData.newOwner}</p>
                                    </div>
                                )
                            })
                        }
                    </div>
                    <p></p>
                    <p></p>
                    <p></p>
                    <p></p>
                    <div className="mb-4">
                        <h5>Vault Transfer Received</h5>
                        {
                            vaultsTransferReceivedList.length === 0

                            ?

                            <p>You have not received any incoming vault transfer request.</p>

                            :

                            <Table columns={columns} data={vaultsTransferReceivedList} />
                        }
                    </div>
                </div>
            </div>
        </div>
    )
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
                        id: 'vaultId',
                        desc: false
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

export default DummyVaultOpTable;