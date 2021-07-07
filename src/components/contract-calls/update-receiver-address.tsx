import React, { useState, useContext } from 'react';
import { toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import { bech32ToChecksum, showWalletsPrompt } from '../../util/utils';
import { OperationStatus, ProxyCalls, TransactionType } from "../../util/enum";
import * as ZilliqaAccount from "../../account";
import AppContext from '../../contexts/appContext';
import Alert from '../alert';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';
import { useAppSelector } from '../../store/hooks';

const { BN } = require('@zilliqa-js/util');


function UpdateReceiverAddress(props: any) {
    const receiver = useAppSelector(state => state.user.operator_stats.receiver);
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const { proxy, networkURL, currentReceiver, ledgerIndex, updateData, updateRecentTransactions } = props;
    const [newAddress, setNewAddress] = useState('');
    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const updateAddress = async () => {
        if (!newAddress) {
            Alert('error', "Invalid Address", "Receiving address should be bech32 or checksum format.");
            return null;
        }

        // create tx params

        // toAddr: proxy address
        const proxyChecksum = bech32ToChecksum(proxy);
        const newReceivingAddress = bech32ToChecksum(newAddress).toLowerCase();

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
        
        showWalletsPrompt(accountType);

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams, ledgerIndex)
            .then((result) => {
                console.log(result);
                if (result === OperationStatus.ERROR) {
                    Alert('error', "Transaction Error", "Please try again.");
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
        // invoke dashboard methods
        if (txnId) {
            updateRecentTransactions(TransactionType.UPDATE_RECV_ADDR, txnId);
            updateData();
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
                            <h5 className="modal-title" id="updateRecvAddrModalLabel">Update Receiving Address</h5>
                            <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel">
                                    <h3>Current Receiving Address</h3>
                                    <span>{receiver ? receiver : 'none'}</span>
                                </div>
                            </div>
                            <input type="text" className="mb-4" value={newAddress} onChange={(e:any) => setNewAddress(e.target.value)} placeholder="Enter new address in bech32 format" />
                            <div className="d-flex mt-2">
                            <button type="button" className="btn btn-user-action mx-auto shadow-none" onClick={updateAddress}>Update</button>
                            </div>
                        </div>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}

export default UpdateReceiverAddress;