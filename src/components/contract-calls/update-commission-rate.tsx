import React, { useState, useContext } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';
import { AuthContext } from '../../contexts/authContext';
import { OperationStatus, AccessMethod } from "../../util/enum";
import * as Account from "../../account";
import Alert from '../alert';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

function UpdateCommRateModal(props: any) {
    const authContext = useContext(AuthContext);
    const { proxy, currentRate } = props;
    const [newRate, setNewRate] = useState('');
    const [txnId, setTxnId] = useState('')
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState('');

    const handleClose = () => {
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setNewRate('');
            setTxnId('');
            setError('');
            setIsPending('');
        }, 150);
    }

    const updateCommRate = async () => {
        setIsPending(OperationStatus.PENDING);
        trackPromise(Account.updateCommissionRate(proxy, newRate)
            .then((result) => {
                console.log(result);
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

    const ledgerUpdateCommRate = async () => {
        if (authContext.accountType === AccessMethod.LEDGER) {
            console.log("access method is ledger!");
        }
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