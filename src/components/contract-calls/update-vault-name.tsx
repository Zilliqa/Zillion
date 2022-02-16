import React, { useState } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';
import { useAppSelector } from '../../store/hooks';
import { OperationStatus, TransactionType } from '../../util/enum';
import { VaultDataMap } from '../../util/interface';
import { ZilSigner } from '../../zilliqa-signer';
import { ZilTxParser } from '../../zilliqa-txparser';
import Alert from '../alert';
import ModalContent from '../modal-contents/modal-content';


function UpdateVaultNameModal(props: any) {
    const selectedVaultId = useAppSelector(state => state.user.selected_vault);
    const vaultsDataMap: VaultDataMap = useAppSelector(state => state.user.vaults_data_map);
    const ledgerIndex = useAppSelector(state => state.user.ledger_index);
    const accountType = useAppSelector(state => state.user.account_type);

    const defaultGasPrice = ZilSigner.getDefaultGasPrice();
    const defaultGasLimit = ZilSigner.getDefaultGasLimit();

    const [newVaultName, setVaultName] = useState('');

    const [pending, setPending] = useState(OperationStatus.IDLE);
    const [txnId, setTxnId] = useState('');

    const { updateData, updateRecentTransactions } = props;

    const onChangeVaultName = (name: string) => {
        setVaultName(name);
    }

    const onUpdateVaultName = () => {
        let vaultAddress = vaultsDataMap[selectedVaultId].vaultAddress;

        let txParams = ZilTxParser.parseUpdateVaultName(vaultAddress, newVaultName, defaultGasPrice, defaultGasLimit);

        trackPromise(ZilSigner.sign(accountType, txParams, ledgerIndex)
            .then((result) => {
                if (result === OperationStatus.ERROR) {
                    Alert('error', "Transaction Error", "Please try again.");
                } else {
                    setTxnId(result);
                }
            }).finally(() => {
                setPending(OperationStatus.IDLE);
            })
        );
    }

    const onCloseModal = () => {
        // txn success
        // invoke dashboard functions to update recent transactions and poll data
        if (txnId) {
            updateRecentTransactions(TransactionType.REQUEST_VAULT_TRANSFER, txnId);
            updateData();
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setVaultName('');
            setTxnId('');
        }, 150);
    }

    return (
        <div 
            id="update-vault-name-modal"
            className="modal fade"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="updateVaultNameModal"
            aria-hidden="true">
            <div className="contract-calls-modal modal-dialog modal-dialog-centered modal-lg" role="document">
                {
                    pending === OperationStatus.PENDING

                    ?

                    <ModalContent progress='tx-pending' />

                    :

                    txnId

                    ?

                    <ModalContent
                        progress='tx-sent'
                        txnId={txnId}
                        onCloseModal={onCloseModal} />
                    
                    :

                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="updateVaultNameModal">Update Vault Name</h5>
                            <button 
                                type="button" 
                                className="close btn shadow-none" 
                                data-dismiss="modal" 
                                aria-label="Close"
                                onClick={onCloseModal}>
                                    <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-4">
                                <div className="modal-label mb-2">
                                    <strong>Vault</strong>
                                </div>
                                <div>
                                    <span>{vaultsDataMap[selectedVaultId] ? vaultsDataMap[selectedVaultId].vaultAddress : ''}</span>
                                </div>
                            </div>
                            <div className="mb-4">
                                <div className="modal-label mb-2">
                                    <strong>Enter new vault name</strong>
                                </div>
                                <div className="input-group">
                                    <input type="text" className="form-control shadow-none" value={newVaultName} onChange={(e) => onChangeVaultName(e.target.value)} />
                                </div>
                            </div>
                            <div className="d-flex my-4 text-center">
                                <button 
                                    type="button"
                                    className="btn btn-user-action mx-2 shadow-none"
                                    onClick={() => onUpdateVaultName()}>
                                    Update Vault Name
                                </button>
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}

export default UpdateVaultNameModal;