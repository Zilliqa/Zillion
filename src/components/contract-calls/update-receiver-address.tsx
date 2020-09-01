import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';
import { OperationStatus } from "../../util/enum";
import * as Account from "../../account";
import Alert from '../alert';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

function UpdateReceiverAddress(props: any) {
    const { proxy, currentReceiver } = props;
    const [newAddress, setNewAddress] = useState('');
    const [txnId, setTxnId] = useState('');
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState('');

    const handleClose = () => {
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setNewAddress('');
            setTxnId('');
            setError('');
            setIsPending('');
        }, 150);
    }

    const updateAddress = async () => {
        setIsPending(OperationStatus.PENDING);
        trackPromise(Account.updateReceiverAddress(proxy, newAddress)
            .then((result) => {
                console.log(result);
                if (result === OperationStatus.ERROR) {
                    setError(OperationStatus.ERROR);
                    Alert('error', "There is an error. Please try again.");
                } else {
                    const resultJson = JSON.parse(result);
                    setTxnId(resultJson.txn_id);
                }
            })
            .finally(() => {
                setIsPending('');
            }));
    }

    return (
        <div id="update-recv-addr-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="updateRecvAddrModalLabel" aria-hidden="true">
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
                            <h5 className="modal-title" id="updateRecvAddrModalLabel">Update Received Address</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Current Received Address: {currentReceiver ? currentReceiver : 'none'}</p>
                            <input type="text" className="form-control mb-4" value={newAddress} onChange={(e:any) => setNewAddress(e.target.value)} placeholder="Enter new address in ByStr20" />
                            <button type="button" className="btn btn-user-action mr-2" onClick={updateAddress}>Update</button>
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

export default UpdateReceiverAddress;