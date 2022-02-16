import { fromBech32Address, toBech32Address } from "@zilliqa-js/zilliqa";
import React, { useState } from "react";
import { trackPromise } from "react-promise-tracker";
import { toast } from "react-toastify";
import { useAppSelector } from "../../store/hooks";
import { OperationStatus, TransactionType } from "../../util/enum";
import { bech32ToChecksum, showWalletsPrompt } from "../../util/utils";
import { ZilSigner } from "../../zilliqa-signer";
import { ZilTxParser } from "../../zilliqa-txparser";
import Alert from "../alert";
import ModalContent from "../modal-contents/modal-content";

const { validation } = require('@zilliqa-js/util');


/**
 * transfer vault ownership
 */
function TransferVaultModal(props: any) {
    const vaultIds = useAppSelector(state => state.user.vaults_id_address_map);
    const ledgerIndex = useAppSelector(state => state.user.ledger_index);
    const accountType = useAppSelector(state => state.user.account_type);

    const [selectedVault, setSelectedVault] = useState(-1);
    const [newOwner, setNewOwner] = useState('');

    const defaultGasPrice = ZilSigner.getDefaultGasPrice();
    const defaultGasLimit = ZilSigner.getDefaultGasLimit();
    const [gasPrice, setGasPrice] = useState<string>(defaultGasPrice);
    const [gasLimit, setGasLimit] = useState<string>(defaultGasLimit);

    const [pending, setPending] = useState(OperationStatus.IDLE);
    const [txnId, setTxnId] = useState('');

    const { updateData, updateRecentTransactions } = props;


    const sendRequest = () => {

        let newOwnerBase16 = fromBech32Address(newOwner);
        let txParams = ZilTxParser.parseInitVaultTransfer(newOwnerBase16, selectedVault, gasPrice, gasLimit)

        setPending(OperationStatus.PENDING);
        showWalletsPrompt(accountType);
        
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

    const onSelectVault = (id: number) => {
        setSelectedVault(id);
    }

    const onChangeNewOwner = (owner: string) => {
        if (!owner || owner === null) {
            return;
        }
        if (owner && (validation.isAddress(owner) || validation.isBech32(owner)) ) {
            owner = toBech32Address(bech32ToChecksum(owner));
        }
        setNewOwner(owner);
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
            setSelectedVault(-1);
            setNewOwner('');
            setTxnId('');
            setGasPrice(defaultGasPrice);
            setGasLimit(defaultGasLimit);
        }, 150);
    }

    return (
        <div
            id="transfer-vault-modal"
            className="modal fade"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="transferVaultModalLabel"
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
                            <h5 className="modal-title" id="transferVaultModalLabel">Transfer Vault</h5>
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
                                    <strong>Vaults</strong>
                                </div>
                                <select
                                    className="form-select"
                                    onChange={(e) => onSelectVault(Number(e.target.value))}>
                                    {
                                        Object.entries(vaultIds).map(([vaultId, vaultAddress]) => {
                                            return (<option key={vaultId} value={vaultId}>Vault: {vaultId}, Vault Address: {vaultAddress}</option>)
                                        })
                                    }
                                </select>
                            </div>
                            <div>
                                <div className="modal-label mb-2">
                                    <strong>Enter new owner address</strong>
                                </div>
                                <div className="input-group">
                                    <input type="text" className="form-control shadow-none" value={newOwner} onChange={(e) => onChangeNewOwner(e.target.value)} />
                                </div>
                            </div>
                            <div className="d-flex my-4 text-center">
                                <button 
                                    type="button"
                                    className="btn btn-user-action mx-2 shadow-none"
                                    onClick={() => sendRequest()}>
                                        Send Transfer Request
                                </button>
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>
    );
}

export default TransferVaultModal;