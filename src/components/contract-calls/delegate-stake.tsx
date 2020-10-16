import React, { useState, useContext, useEffect, useCallback } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import Alert from '../alert';
import { bech32ToChecksum, convertZilToQa, convertToProperCommRate, showWalletsPrompt, convertQaToCommaStr } from '../../util/utils';
import { OperationStatus, ProxyCalls, TransactionType } from '../../util/enum';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

const BigNumber = require('bignumber.js');
const { BN, units } = require('@zilliqa-js/util');


function DelegateStakeModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const proxy = props.proxy;
    const ledgerIndex = props.ledgerIndex;
    const networkURL = props.networkURL;
    const minDelegStake = props.minDelegStake; // Qa
    const balance = props.balance; // Qa
    const minDelegStakeDisplay = units.fromQa(new BN(minDelegStake), units.Units.Zil); // for display

    const { delegStakeModalData, updateData, updateRecentTransactions } = props;

    const ssnAddress = delegStakeModalData.ssnAddress; // bech32

    const [delegAmt, setDelegAmt] = useState('0'); // in ZIL
    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const delegateStake = async () => {
        if (!ssnAddress) {
            Alert('error', "Invalid Node", "Node address should be bech32 or checksum format.");
            return null;
        }

        let delegAmtQa = '';

        if (!delegAmt) {
            Alert('error', "Invalid Stake Amount", "Stake amount shoud not be empty.");
            return null;
        } else {
            try {
                delegAmtQa = convertZilToQa(delegAmt);
                const isLessThanMinDeleg = new BigNumber(delegAmtQa).isLessThan(minDelegStake);
                

                if (isLessThanMinDeleg) {
                    Alert('error', "Invalid Stake Amount", "Minimum stake amount is " + minDelegStakeDisplay + " ZIL.");
                    return null;
                }

            } catch (err) {
                // user input is malformed
                // cannot convert input zil amount to qa
                Alert('error', "Invalid Stake Amount", "Minimum stake amount is " + minDelegStakeDisplay + " ZIL.");
                return null;
            }
        }

        // create tx params

        // toAddr: proxy address
        // amount: amount in Qa to stake
        console.log("ssn address: %o", ssnAddress);
        console.log("proxy: %o", proxy);

        const proxyChecksum = bech32ToChecksum(proxy);
        const ssnChecksumAddress = bech32ToChecksum(ssnAddress).toLowerCase();

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(`${delegAmtQa}`),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.DELEGATE_STAKE,
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

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams, ledgerIndex)
            .then((result) => {
                console.log(result);
                if (result === OperationStatus.ERROR) {
                    Alert('error', "Transaction Error", "Please try again.");
                } else {
                    setTxnId(result)
                }
            }).finally(() => {
                setIsPending('');
            }));
    }

    const setDefaultStakeAmt = useCallback(() => {
        if (minDelegStake) {
            setDelegAmt(units.fromQa(new BN(minDelegStake), units.Units.Zil).toString());
        } else {
            setDelegAmt('0');
        }
    }, [minDelegStake]);

    const handleClose = () => {
        // txn success
        // invoke dashboard functions to update recent transactions and poll data
        if (txnId) {
            updateRecentTransactions(TransactionType.DELEGATE_STAKE, txnId);
            updateData();
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setDefaultStakeAmt();
            setTxnId('');
        }, 150);
    }

    const handleDelegAmt = (e: any) => {
        setDelegAmt(e.target.value);
    }

    useEffect(() => {
        setDefaultStakeAmt();
    }, [setDefaultStakeAmt]);

    return (
        <div id="delegate-stake-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="delegateStakeModalLabel" aria-hidden="true">
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
                            <h5 className="modal-title" id="delegateStakeModalLabel">Stake</h5>
                            <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel mr-4">
                                    <h3>{delegStakeModalData.ssnName}</h3>
                                    <span>{delegStakeModalData.ssnAddress}</span>
                                </div>
                                <div className="col node-details-panel">
                                    <h3>Commission Rate</h3>
                                    <span>{convertToProperCommRate(delegStakeModalData.commRate).toFixed(2)}%</span>
                                </div>
                            </div>

                            <div className="modal-label mb-2">Enter stake amount</div>
                            <div className="input-group mb-2">
                                <input type="text" className="form-control shadow-none" value={delegAmt} onChange={handleDelegAmt} />
                                <div className="input-group-append">
                                    <span className="input-group-text pl-4 pr-3">ZIL</span>
                                </div>
                            </div>
                            <p><small>Wallet balance: <strong>{convertQaToCommaStr(balance)}</strong> ZIL</small></p>
                            <div className="mb-4">
                                <small><strong>Notes</strong></small>
                                <ul>
                                    <li><small>Minimum staking amount is <strong>{minDelegStakeDisplay}</strong> ZIL.</small></li>
                                    <li><small>Please ensure you have at least <strong>100 ZIL</strong> after staking to pay for gas fees for future transactions such as withdrawal.</small></li>
                                </ul>
                            </div>
                            <div className="d-flex">
                                <button type="button" className="btn btn-user-action mx-auto shadow-none" onClick={delegateStake}>Stake</button>
                            </div>
                        </div>
                         </>
                     }
                 </div>
            </div>
        </div>
    );
}

export default DelegateStakeModal;