import React, { useState, useContext, useEffect, useCallback } from 'react';
import * as ZilliqaAccount from '../../account';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';
import { OperationStatus, ProxyCalls } from '../../util/enum';
import { bech32ToChecksum, convertBase16ToBech32 } from '../../util/utils';
import Alert from '../alert';
import AppContext from '../../contexts/appContext';
import { toBech32Address, fromBech32Address } from '@zilliqa-js/crypto';

const { BN, units } = require('@zilliqa-js/util');

function SwapDelegModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;
    
    const {proxy, ledgerIndex, networkURL, swapDelegModalData} = props;
    const proxyChecksum = bech32ToChecksum(proxy);

    // transfer all stakes to this new deleg
    const [newDelegAddr, setNewDelegAddr] = useState('');
    const [isPending, setIsPending] = useState('');

    const handleNewDelegAddr = (e : any) => {
        // TODO: validate addr
        setNewDelegAddr(e.target.value);
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
        }));
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
        }));
    }

    return (
        <div id="swap-deleg-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="swapDelegModalLabel" aria-hidden="true">
            <div className="contract-calls-modal modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    
                    <div className="modal-header">
                        <h5 className="modal-title" id="swapDelegModalLabel">Transfer Stake</h5>
                        <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="modal-label mb-2">Enter wallet address</div>
                        <div className="input-group mb-2">
                            <input type="text" className="form-control shadow-none" value={newDelegAddr} onChange={handleNewDelegAddr} />
                        </div>

                        <h2 className="node-details-subheading mb-2">My Request</h2>
                        <p>{convertBase16ToBech32(swapDelegModalData.swapRecipientAddress)}</p>
                        {
                            swapDelegModalData.swapRecipientAddress ?
                            <button type="button" className="btn btn-contract-small shadow-none" onClick={revokeDelegSwap}>Revoke</button> :
                            null
                        }                        

                        <h2 className="node-details-subheading mb-2">Transfer In Requests</h2>
                        <p>{swapDelegModalData.requestorList}</p>
                        <ul>
                            {
                                swapDelegModalData.requestorList.map((requestorAddr: string, index: number) => (
                                    <li key={index}>{convertBase16ToBech32(requestorAddr)}</li>
                                ))
                            }
                        </ul>

                        <div className="d-flex">
                            <button type="button" className="btn btn-user-action mx-auto shadow-none" onClick={requestDelegSwap}>Send Request</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default SwapDelegModal;