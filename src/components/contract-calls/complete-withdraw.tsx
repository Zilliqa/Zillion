import React, { useState } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';

import Alert from '../alert';
import { bech32ToChecksum, showWalletsPrompt } from '../../util/utils';
import { AccountType, OperationStatus, ProxyCalls, TransactionType } from '../../util/enum';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';
import { useAppSelector } from '../../store/hooks';
import { ZilSigner } from '../../zilliqa-signer';

const { BN } = require('@zilliqa-js/util');

function CompleteWithdrawModal(props: any) {
    const proxy = useAppSelector(state => state.blockchain.proxy);
    const networkURL = useAppSelector(state => state.blockchain.blockchain);
    const ledgerIndex = useAppSelector(state => state.user.ledger_index);
    const accountType = useAppSelector(state => state.user.account_type);
    const { updateData, updateRecentTransactions } = props;

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
        
        showWalletsPrompt(accountType);

        trackPromise(ZilSigner.sign(accountType as AccountType, txParams, ledgerIndex)
            .then((result) => {
                if (result === OperationStatus.ERROR) {
                    Alert('error', "Transaction Error", "Please try again.");
                } else {
                    setTxnId(result)
                }
            }).finally(() => {
                setIsPending('');
            })
        );
    }

    const handleClose = () => {
        // txn success
        // invoke dashboard methods
        if (txnId) {
            updateRecentTransactions(TransactionType.COMPLETE_STAKE_WITHDRAW, txnId);
            updateData();
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
                            <h5 className="modal-title" id="completeWithdrawModalLabel">Complete Stake Withdrawals</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you wish to withdraw all your pending stakes?</p>
                            <div className="d-flex">
                                <button type="button" className="btn btn-user-action mx-auto" onClick={completeWithdraw}>Withdraw</button>
                            </div>
                        </div>
                         </>
                     }
                 </div>
            </div>
        </div>
    );
}

export default CompleteWithdrawModal;