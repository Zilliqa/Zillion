import React, { useState, useContext } from 'react';
import Select from 'react-select';
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
    // const impl = props.impl;
    const ledgerIndex = props.ledgerIndex;
    const networkURL = props.networkURL;
    const { claimedRewardsModalData, updateData, updateRecentTransactions } = props;

    // const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

    const nodeSelectorOptions = props.nodeSelectorOptions;
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

    const handleChange = (option: any) => {
        console.log(option.value);
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
                            <h5 className="modal-title" id="withdrawRewardModalLabel">Claim Rewards Confirmation</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <table className="modal-confirm-table-details table table-responsive-lg text-center">
                                <thead>
                                    <tr>
                                        <th scope="col">Name</th>
                                        <th scope="col">Address</th>
                                        <th scope="col">Rewards (ZIL)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{claimedRewardsModalData.ssnName}</td>
                                        <td>{claimedRewardsModalData.ssnAddress}</td>
                                        <td>{convertQaToCommaStr(claimedRewardsModalData.rewards)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p>Please confirm the <strong>address</strong> and <strong>rewards</strong> before claiming.</p>
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