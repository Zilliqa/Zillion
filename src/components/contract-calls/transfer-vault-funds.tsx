import { toBech32Address, validation } from "@zilliqa-js/zilliqa";
import React, { useState } from "react";
import { trackPromise } from "react-promise-tracker";
import { useAppSelector } from "../../store/hooks";
import { VaultDataMap } from "../../util/interface";
import { bech32ToChecksum } from "../../util/utils";
import { ZilSigner } from "../../zilliqa-signer";
import { ZilTxParser } from "../../zilliqa-txparser";


/**
 * transfer vault's funds to another vault
 * 
 * THIS IS NOT TRANSFER VAULT OWNERSHIP
 */
function TransferVaultFundsModal(props: any) {
    const vaultsDataMap: VaultDataMap = useAppSelector(state => state.user.vaults_data_map);
    const ledgerIndex = useAppSelector(state => state.user.ledger_index);
    const accountType = useAppSelector(state => state.user.account_type);
    
    const defaultGasPrice = ZilSigner.getDefaultGasPrice();
    const defaultGasLimit = ZilSigner.getDefaultGasLimit();

    const [selectedVault, setSelectedVault] = useState(-1);
    const [newVault, setNewVault] = useState('');


    const onSelectVault = (id: number) => {
        setSelectedVault(id);
    }

    const onChangeNewVault = (vault: string) => {
        // vault address
        if (!vault || vault === null) {
            return;
        }

        if (vault && (validation.isAddress(vault) || validation.isBech32(vault)) ) {
            vault = toBech32Address(bech32ToChecksum(vault));
        }
        setNewVault(vault);
    }

    const onCloseModal = () => {

    }

    const sendRequest = () => {
        let txParams = ZilTxParser.parseRequestDelegatorSwapBZIL(newVault, selectedVault, defaultGasPrice, defaultGasLimit);
        
        trackPromise(ZilSigner.sign(accountType, txParams, ledgerIndex)
            .then((result) => {
                console.log(result);
            }).finally(() => {

            })
        );
    }

    return (
        <div
            id="transfer-vault-funds-modal"
            className="modal fade"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="transferVaultFundsModalLabel"
            aria-hidden="true">
            <div className="contract-calls-modal modal-dialog modal-dialog-centered modal-lg" role="document">
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
                                    Object.entries(vaultsDataMap).map(([vaultId, vaultData]) => {
                                        return (<option key={vaultId} value={vaultId}>Vault: {vaultId}, Vault Address: {vaultData.vaultAddress}</option>)
                                    })
                                }
                            </select>
                        </div>
                        <div>
                            <div className="modal-label mb-2">
                                <strong>Enter new vault address</strong>
                            </div>
                            <div className="input-group">
                                <input type="text" className="form-control shadow-none" value={newVault} onChange={(e) => onChangeNewVault(e.target.value)} />
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
            </div>
        </div>
    );
}

export default TransferVaultFundsModal;