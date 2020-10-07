import React, { useState, useContext } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import Alert from '../alert';
import { bech32ToChecksum, convertQaToCommaStr } from '../../util/utils';
import { OperationStatus, AccessMethod, ProxyCalls, TransactionType } from '../../util/enum';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

const { BN } = require('@zilliqa-js/util');


function WithdrawRewardModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const proxy = props.proxy;
    const ledgerIndex = props.ledgerIndex;
    const networkURL = props.networkURL;
    const { claimedRewardsModalData, updateData, updateRecentTransactions } = props;

    const ssnAddress = claimedRewardsModalData.ssnAddress; // bech32

    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const withdrawReward = async () => {
        if (!ssnAddress) {
            Alert('error', "operator address should be bech32 or checksum format");
            return null;
        }

        // create tx params

        // toAddr: proxy address
        const proxyChecksum = bech32ToChecksum(proxy);
        const ssnChecksumAddress = bech32ToChecksum(ssnAddress).toLowerCase();

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.WITHDRAW_STAKE_REWARDS,
                params: [
                    {
                        vname: 'ssnaddr',
                        type: 'ByStr20',
                        value: `${ssnChecksumAddress}`,
                    }
                ]
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
            updateRecentTransactions(TransactionType.CLAIM_REWARDS, txnId);
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
        <div id="withdraw-reward-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="withdrawRewardModalLabel" aria-hidden="true">
            <div className="contract-calls-modal modal-dialog modal-lg" role="document">
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
                            <h5 className="modal-title" id="withdrawRewardModalLabel">Claim Rewards</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel mr-4">
                                    <h3>{claimedRewardsModalData.ssnName}</h3>
                                    <span>{claimedRewardsModalData.ssnAddress}</span>
                                </div>
                                <div className="col node-details-panel">
                                    <h3>Rewards</h3>
                                    <span>{convertQaToCommaStr(claimedRewardsModalData.rewards)} ZIL</span>
                                </div>
                            </div>
                            <p><small><em>Please confirm the <strong>address</strong> and <strong>rewards</strong> before claiming.</em></small></p>
                            <div className="d-flex mt-4">
                                <button type="button" className="btn btn-user-action mx-auto" onClick={withdrawReward}>Claim {convertQaToCommaStr(claimedRewardsModalData.rewards)} ZIL</button>
                            </div>

                        </div>
                         </>
                     }
                 </div>
            </div>
        </div>
    );
}

export default WithdrawRewardModal;