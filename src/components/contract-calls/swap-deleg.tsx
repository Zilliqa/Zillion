import React, { useState, useContext, useEffect, useCallback } from 'react';
import * as ZilliqaAccount from '../../account';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';
import { OperationStatus, ProxyCalls } from '../../util/enum';
import { bech32ToChecksum, convertBase16ToBech32 } from '../../util/utils';
import Alert from '../alert';
import AppContext from '../../contexts/appContext';
import { toBech32Address, fromBech32Address } from '@zilliqa-js/crypto';

import IconArrowDown from '../icons/arrow-down';

const { BN } = require('@zilliqa-js/util');

function SwapDelegModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;
    
    const {proxy, ledgerIndex, networkURL, swapDelegModalData, userAddress} = props;
    const proxyChecksum = bech32ToChecksum(proxy);

    // transfer all stakes to this new deleg
    const [newDelegAddr, setNewDelegAddr] = useState('');
    const [isPending, setIsPending] = useState('');
    const [isEdit, setIsEdit] = useState(false);

    const handleNewDelegAddr = (e : any) => {
        // TODO: validate addr
        setNewDelegAddr(e.target.value);
    }

    const sendTxn = (txParams: any) => {
        setIsPending(OperationStatus.PENDING);

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams, ledgerIndex)
        .then((result) => {
            if (result === OperationStatus.ERROR) {
                Alert('error', "Transaction Error", "Please try again.");
            } else {
                console.log(result);
            }
        }).finally(() => {
            setIsPending('');
            setIsEdit(false);
        }));
    }

    const confirmDelegSwap = async (requestorAddr: string) => {
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.CONFIRM_DELEG_SWAP,
                params: [
                    {
                        vname: 'requestor',
                        type: 'ByStr20',
                        value: `${requestorAddr}`,
                    }
                ]
            })
        };

        sendTxn(txParams);
    }

    const rejectDelegSwap = async (requestorAddr: string) => {
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.REJECT_DELEG_SWAP,
                params: [
                    {
                        vname: 'requestor',
                        type: 'ByStr20',
                        value: `${requestorAddr}`,
                    }
                ]
            })
        };

        sendTxn(txParams);
    }

    const requestDelegSwap = async () => {
        if (!newDelegAddr) {
            Alert('error', "Invalid Address", "Wallet address should be bech32 or checksum format.");
            return null;
        }

        console.log("new deleg addr: %o", newDelegAddr)

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.REQUEST_DELEG_SWAP,
                params: [
                    {
                        vname: 'new_deleg_addr',
                        type: 'ByStr20',
                        value: `${fromBech32Address(newDelegAddr)}`,
                    }
                ]
            })
        };

        sendTxn(txParams);
    }

    const revokeDelegSwap = async () => {
        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.REVOKE_DELEG_SWAP,
                params: []
            })
        };

        sendTxn(txParams);
    }

    return (
        <div id="swap-deleg-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="swapDelegModalLabel" aria-hidden="true">
            <div className="contract-calls-modal modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    
                    <div className="modal-header">
                        <h5 className="modal-title" id="swapDelegModalLabel">Change Stake Ownership</h5>
                        <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <div className="modal-body">
                        {
                            swapDelegModalData.swapRecipientAddress 
                            ?
                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel">
                                    <h3>Pending New Owner To Accept</h3>
                                    <span>{userAddress} (Connected Wallet)</span>
                                    <br/>
                                    <IconArrowDown width="16" height="16" className="swap-icon mt-2 mb-2"/>
                                    <br/>
                                    <span>{convertBase16ToBech32(swapDelegModalData.swapRecipientAddress)} (New Owner)</span>
                                </div>
                            </div>
                            :
                            null
                        }

                        
                        {
                            // show new address form if editing or no swap recipient
                            (isEdit || !swapDelegModalData.swapRecipientAddress)
                            ?
                            <>
                            <div className="modal-label mb-2">Enter new owner address</div>
                            <div className="input-group mb-2">
                                <input type="text" className="form-control shadow-none" value={newDelegAddr} onChange={handleNewDelegAddr} />
                            </div> 
                            </>
                            :
                            null
                        }                     

                        <h2 className="node-details-subheading mb-2">Incoming Transfer Requests</h2>
                        <ul>
                            {
                                swapDelegModalData.requestorList.map((requestorAddr: string, index: number) => (
                                    <li key={index}>{convertBase16ToBech32(requestorAddr)}
                                        <button type="button" className="btn btn-contract-small shadow-none" onClick={() => confirmDelegSwap(requestorAddr)}>Accept</button>
                                        <button type="button" className="btn shadow-none" onClick={() => rejectDelegSwap(requestorAddr)}>Reject</button>
                                    </li>
                                ))
                            }
                        </ul>

                        <div className="d-flex">
                            {
                                swapDelegModalData.swapRecipientAddress
                                ?
                                <div className="mx-auto">
                                    {
                                        isEdit
                                        ?
                                        // allow users to send the modified address
                                        <button type="button" className="btn btn-user-action mx-2 shadow-none" onClick={requestDelegSwap}>Send Request</button>
                                        :
                                        <button type="button" className="btn btn-user-action mx-2 shadow-none" onClick={() => setIsEdit(true)}>Edit Request</button>
                                    }
                                    <button type="button" className="btn btn-user-action-cancel mx-2 shadow-none" onClick={revokeDelegSwap}>Revoke Request</button>
                                </div>
                                :
                                // show new owner form
                                <button type="button" className="btn btn-user-action mx-auto shadow-none" onClick={requestDelegSwap}>Send Request</button>
                            }
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default SwapDelegModal;