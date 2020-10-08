import React, { useState, useContext } from 'react';
import { toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';
import { OperationStatus, ProxyCalls, TransactionType } from "../../util/enum";
import { bech32ToChecksum, convertQaToCommaStr, showWalletsPrompt } from '../../util/utils';
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
                                <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="row node-details-wrapper mb-4">
                                    <div className="col node-details-panel">
                                        <h3>Commission Rewards</h3>
                                        <span>{currentRewards ? convertQaToCommaStr(currentRewards) : '0.000'} ZIL?</span>
                                    </div>
                                </div>
                                <p>Are you sure you wish to withdraw <strong>{currentRewards ? convertQaToCommaStr(currentRewards) : '0.000'}</strong> ZIL</p>
                                <div className="d-flex mt-2">
                                    <button type="button" className="btn btn-user-action mx-auto shadow-none" onClick={withdrawComm}>Withdraw</button>
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