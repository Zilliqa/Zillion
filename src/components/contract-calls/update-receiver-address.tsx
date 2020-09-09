import React, { useState, useContext } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import { bech32ToChecksum } from '../../util/utils';
import { AccessMethod, OperationStatus, ProxyCalls } from "../../util/enum";
import * as ZilliqaAccount from "../../account";
import AppContext from '../../contexts/appContext';
import Alert from '../alert';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

const { BN } = require('@zilliqa-js/util');


function UpdateReceiverAddress(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const { proxy, networkURL, currentReceiver, onSuccessCallback } = props;
    const [newAddress, setNewAddress] = useState('');
    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const updateAddress = async () => {
        if (!newAddress) {
            Alert('error', "receiving address should be bech32 or checksum format");
            return null;
        }

        // create tx params

        // toAddr: proxy address
        const proxyChecksum = bech32ToChecksum(proxy);
        const newReceivingAddress = bech32ToChecksum(newAddress);

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.UPDATE_RECV_ADDR,
                params: [
                    {
                        vname: 'new_addr',
                        type: 'ByStr20',
                        value: `${newReceivingAddress}`,
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
            })
            .finally(() => {
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
            setNewAddress('');
            setTxnId('');
            setIsPending('');
        }, 150);
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

                        <ModalSent txnId={txnId} networkURL={networkURL} handleClose={handleClose} />

                        :
                        <>
                        <div className="modal-header">
                            <h5 className="modal-title" id="updateRecvAddrModalLabel">Update Receiving Address</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Current Received Address: {currentReceiver ? currentReceiver : 'none'}</p>
                            <input type="text" className="form-control mb-4" value={newAddress} onChange={(e:any) => setNewAddress(e.target.value)} placeholder="Enter new address in bech32 format" />
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