import React, { useState, useContext } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import AppContext from '../../contexts/appContext';
import { OperationStatus, AccessMethod, ProxyCalls } from "../../util/enum";
import { bech32ToChecksum, percentToContractCommRate } from '../../util/utils';
import * as ZilliqaAccount from "../../account";
import Alert from '../alert';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

const { BN } = require('@zilliqa-js/util');

function UpdateCommRateModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const { proxy, networkURL, currentRate, onSuccessCallback } = props;
    const [newRate, setNewRate] = useState('');
    const [txnId, setTxnId] = useState('')
    const [isPending, setIsPending] = useState('');


    const updateCommRate = async () => {
        if (!newRate || !newRate.match(/\d/)) {
            Alert('error', "Commission rate is invalid.");
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

        if (accountType === AccessMethod.LEDGER) {
            Alert('info', "Accessing the ledger device for keys.");
            Alert('info', "Please follow the instructions on the device.");
        }

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams)
            .then((result) => {
                console.log(result);
                if (result === OperationStatus.ERROR) {
                    Alert('error', "There is an error. Please try again.");
                } else {
                    setTxnId(result);
                }
            }).finally(() => {
                setIsPending('');
            }));
    }

    const handleClose = () => {
        // txn success
        // update dashboard recent transactions
        if (txnId) {
            onSuccessCallback(txnId);
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
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    {
                        isPending ?
                        
                        <ModalPending />

                        :

                        txnId ?

                        <ModalSent txnId={txnId} handleClose={handleClose} />

                        :

                        <>
                        <div className="modal-header">
                            <h5 className="modal-title" id="updateCommRateModalLabel">Update Commission Rate</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Current Commission Rate: {currentRate ? currentRate : '0'} &#37;</p>
                            <input type="text" className="form-control mb-4" value={newRate} onChange={(e:any) => setNewRate(e.target.value)} placeholder="Enter new rate in %" />
                            <button type="button" className="btn btn-user-action mr-2" onClick={updateCommRate}>Update</button>
                            <button type="button" className="btn btn-user-action-cancel mx-2" data-dismiss="modal" onClick={handleClose}>Cancel</button>
                        </div>
                        </>
                    }
                </div>
            </div>
            <ToastContainer hideProgressBar={true}/>
        </div>
    );
}

export default UpdateCommRateModal;