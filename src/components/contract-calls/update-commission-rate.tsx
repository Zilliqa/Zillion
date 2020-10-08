import React, { useState, useContext } from 'react';
import { toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import AppContext from '../../contexts/appContext';
import { OperationStatus, ProxyCalls, TransactionType } from "../../util/enum";
import { bech32ToChecksum, convertToProperCommRate, percentToContractCommRate, showWalletsPrompt } from '../../util/utils';
import * as ZilliqaAccount from "../../account";
import Alert from '../alert';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

const { BN } = require('@zilliqa-js/util');

function UpdateCommRateModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const { proxy, networkURL, currentRate, ledgerIndex, updateData, updateRecentTransactions } = props;
    const [newRate, setNewRate] = useState('');
    const [txnId, setTxnId] = useState('')
    const [isPending, setIsPending] = useState('');


    const updateCommRate = async () => {
        if (!newRate || !newRate.match(/\d/)) {
            Alert('error', "Invalid Commission Rate", "Please enter an appropriate value, e.g. 10.5");
            return null;
        }

        if (newRate.length > 9) {
            Alert('error', "Invalid Commission Rate", "Commission rate should have a maximum of 7 decimals only.");
            return null;
        }


        // create tx params

        // toAddr: proxy address
        const proxyChecksum = bech32ToChecksum(proxy);
        const contractCommRate = percentToContractCommRate(newRate);

        console.log("my new rate: %o", contractCommRate);

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.UPDATE_COMM,
                params: [
                    {
                        vname: 'new_rate',
                        type: 'Uint128',
                        value: `${contractCommRate}`,
                    }
                ]
            })
        };

        setIsPending(OperationStatus.PENDING);

        showWalletsPrompt(accountType);

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams, ledgerIndex)
            .then((result) => {
                console.log(result);
                if (result === OperationStatus.ERROR) {
                    Alert('error', "Sign Transaction Error", "Please try again.");
                } else {
                    setTxnId(result);
                }
            }).finally(() => {
                setIsPending('');
            }));
    }

    const handleClose = () => {
        // txn success
        // invoke dashboard methods
        if (txnId) {
            updateRecentTransactions(TransactionType.UPDATE_COMM_RATE, txnId);
            updateData();
        }

        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setNewRate('');
            setTxnId('');
            setIsPending('');
        }, 150);
    }

    return (
        <div id="update-comm-rate-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="updateCommRateModalLabel" aria-hidden="true">
            <div className="contract-calls-modal modal-dialog" role="document">
                <div className="modal-content">
                    {
                        isPending ?
                        
                        <ModalPending />

                        :

                        txnId ?

                        <ModalSent txnId={txnId} networkURL={networkURL} handleClose={handleClose} />

                        :

                        <>
                        <div className="modal-header">
                            <h5 className="modal-title" id="updateCommRateModalLabel">Update Commission Rate</h5>
                            <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel">
                                    <h3>Current Commission Rate</h3>
                                    <span>{currentRate ? convertToProperCommRate(currentRate).toFixed(2) : '0.00'}&#37;</span>
                                </div>
                            </div>
                            <div className="input-group mb-4">
                                <input type="text" className="form-control shadow-none" value={newRate} onChange={(e:any) => setNewRate(e.target.value)} placeholder="Enter new rate" maxLength={9} />
                                <div className="input-group-append">
                                    <span className="input-group-text pl-4 pr-3">%</span>
                                </div>
                            </div>
                            <div className="d-flex mt-2">
                                <button type="button" className="btn btn-user-action mx-auto shadow-none" onClick={updateCommRate}>Update</button>
                            </div>
                        </div>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}

export default UpdateCommRateModal;