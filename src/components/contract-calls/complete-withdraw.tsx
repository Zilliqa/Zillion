import React, { useState, useContext } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { ToastContainer, toast } from 'react-toastify';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import Alert from '../alert';
import { bech32ToChecksum } from '../../util/utils';
import { OperationStatus, AccessMethod, ProxyCalls } from '../../util/enum';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

const { BN } = require('@zilliqa-js/util');

function CompleteWithdrawModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const proxy = props.proxy;
    const networkURL = props.networkURL;
    const { onSuccessCallback } = props;

    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const completeWithdraw = async () => {
        // create tx params

        // toAddr: proxy address
        const proxyChecksum = bech32ToChecksum(proxy);
        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.COMPLETE_WITHDRAWAL,
                params: []
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
                    setTxnId(result)
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
            setTxnId('');
        }, 150);
    }

    return (
        <div id="complete-withdrawal-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="completeWithdrawModalLabel" aria-hidden="true">
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
                            <h5 className="modal-title" id="completeWithdrawModalLabel">Complete Withdrawal</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to do a complete withdrawal?</p>
                            <button type="button" className="btn btn-user-action mr-2" onClick={completeWithdraw}>Withdraw</button>
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

export default CompleteWithdrawModal;