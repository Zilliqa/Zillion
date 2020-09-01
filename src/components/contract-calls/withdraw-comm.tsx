import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';
import { OperationStatus } from "../../util/enum";
import * as Account from "../../account";
import Alert from '../alert';
import ModalSpinner from '../modal-spinner';

import IconCheckboxCircle from '../icons/checkbox-circle';

function WithdrawCommModal(props: any) {
    const { proxy, currentRewards } = props;
    const [txnId, setTxnId] = useState('')
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState('')

    const handleClose = () => {
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setTxnId('');
            setError('');
            setIsPending('');
        }, 150);
    }

    const withdrawComm = async () => {
        setIsPending(OperationStatus.PENDING);
        trackPromise(Account.withdrawComm(proxy)
            .then((result) => {
                if (result === OperationStatus.ERROR) {
                    setError(OperationStatus.ERROR);
                    Alert('error', "There is an error. Please try again.");
                } else {
                    const resultJson = JSON.parse(result);
                    setTxnId(resultJson.txn_id);
                }
        }).finally(() => {
            setIsPending('');
        }));
    }

    return (
            <div id="withdraw-comm-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="withdrawCommModalLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        {
                            isPending ?

                            <>
                            <div className="modal-body modal-processing text-center">
                                <h2>Processing...</h2>
                                <p className="mt-4">Please wait 1 - 2 minutes while we process on the blockchain.</p>
                                <ModalSpinner class="spinner-border dashboard-spinner" />
                            </div>
                            </>

                            :
                            
                            txnId ?
                            
                            <>
                            <div className="modal-body text-center">
                                <IconCheckboxCircle className="modal-icon-success" width="80" height="80" />
                                <p className="mt-2"><strong>Transaction Sent</strong><br/><span className="txn-id">{txnId}</span></p>
                                <p>Please check the status on Devex</p>
                                <button type="button" className="btn btn-user-action mx-2" data-dismiss="modal" onClick={handleClose}>Done</button>
                            </div>
                            </>

                            :

                            <>
                            <div className="modal-header">
                                <h5 className="modal-title" id="withdrawCommModalLabel">Withdraw Commission</h5>
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>Current Commission Reward: {currentRewards ? currentRewards : '0'} ZIL</p>
                                <p>Are you sure you want to withdraw the commission rewards?</p>
                                <button type="button" className="btn btn-user-action mr-2" onClick={withdrawComm}>Withdraw</button>
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

export default WithdrawCommModal;