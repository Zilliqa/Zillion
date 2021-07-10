import React, { useState } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';

import Alert from '../alert';
import { bech32ToChecksum, convertQaToCommaStr, convertQaToZilFull, showWalletsPrompt, convertGzilToCommaStr } from '../../util/utils';
import { AccountType, OperationStatus, ProxyCalls, TransactionType } from '../../util/enum';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';
import { StakeModalData } from '../../util/interface';
import { useAppSelector } from '../../store/hooks';
import { ZilSigner } from '../../zilliqa-signer';

const BigNumber = require('bignumber.js');
const { BN } = require('@zilliqa-js/util');


function WithdrawRewardModal(props: any) {
    const proxy = useAppSelector(state => state.blockchain.proxy);
    const networkURL = useAppSelector(state => state.blockchain.blockchain);
    const ledgerIndex = useAppSelector(state => state.user.ledger_index);
    const accountType = useAppSelector(state => state.user.account_type);
    const { updateData, updateRecentTransactions } = props;
    const stakeModalData: StakeModalData = useAppSelector(state => state.user.stake_modal_data);

    const ssnAddress = stakeModalData.ssnAddress; // bech32

    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const withdrawReward = async () => {
        if (!ssnAddress) {
            Alert('error', "Invalid Node", "Node address should be bech32 or checksum format");
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
                            <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel mr-4">
                                    <h3>{stakeModalData.ssnName}</h3>
                                    <span>{stakeModalData.ssnAddress}</span>
                                </div>
                                <div className="col node-details-panel">
                                    <h3>Rewards</h3>
                                    <span>{ new BigNumber(stakeModalData.rewards).isGreaterThanOrEqualTo(10**9) ? convertQaToCommaStr(stakeModalData.rewards) : convertQaToZilFull(stakeModalData.rewards)} ZIL</span>
                                    <span className="gzil-rewards">({convertGzilToCommaStr(stakeModalData.rewards)} GZIL)</span>
                                </div>
                            </div>
                            <div className="d-flex mt-4">
                                <button type="button" className="btn btn-user-action mx-auto shadow-none" onClick={withdrawReward}>Claim</button>
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