import React, { useState, useContext } from 'react';
import { toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';
import { OperationStatus, AccessMethod, ProxyCalls, TransactionType } from "../../util/enum";
import { bech32ToChecksum, convertQaToCommaStr } from '../../util/utils';
import * as ZilliqaAccount from "../../account";
import Alert from '../alert';

import AppContext from '../../contexts/appContext';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

const { BN } = require('@zilliqa-js/util');

function WithdrawCommModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const { proxy, currentRewards, networkURL, ledgerIndex, updateData, updateRecentTransactions } = props;
    const [txnId, setTxnId] = useState('')
    const [isPending, setIsPending] = useState('');

    const withdrawComm = async () => {
        // create tx params

        // toAddr: proxy address
        const proxyChecksum = bech32ToChecksum(proxy);

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.WITHDRAW_COMM,
                params: []
            })
        };

        setIsPending(OperationStatus.PENDING);

        if (accountType === AccessMethod.LEDGER) {
            Alert('info', "Accessing the ledger device for keys.");
            Alert('info', "Please follow the instructions on the device.");
        }

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams, ledgerIndex)
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
        // invoke dashboard methods
        if (txnId) {
            updateRecentTransactions(TransactionType.WITHDRAW_COMM, txnId);
            updateData();
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setTxnId('');
            setIsPending('');
        }, 150);
    }

    return (
            <div id="withdraw-comm-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="withdrawCommModalLabel" aria-hidden="true">
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
                                <h5 className="modal-title" id="withdrawCommModalLabel">Withdraw Commission</h5>
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>Current Commission Reward: {currentRewards ? convertQaToCommaStr(currentRewards) : '0.000'} ZIL</p>
                                <p>Are you sure you wish to withdraw commission rewards ?</p>
                                <div className="d-flex mt-2">
                                    <button type="button" className="btn btn-user-action mx-auto" onClick={withdrawComm}>Withdraw</button>
                                </div>
                            </div>
                            </>
                        }
                    </div>
                </div>
            </div>
    );
}

export default WithdrawCommModal;