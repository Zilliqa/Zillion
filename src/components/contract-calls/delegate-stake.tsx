import React, { useState, useContext } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import Alert from '../alert';
import { bech32ToChecksum, convertZilToQa, convertToProperCommRate } from '../../util/utils';
import { OperationStatus, AccessMethod, ProxyCalls, TransactionType } from '../../util/enum';

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
    const minDelegStakeDisplay = units.fromQa(new BN(minDelegStake), units.Units.Zil); // for display

    const { delegStakeModalData, updateData, updateRecentTransactions } = props;

    const ssnAddress = delegStakeModalData.ssnAddress; // bech32

    const [delegAmt, setDelegAmt] = useState(''); // in ZIL
    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const delegateStake = async () => {
        if (!ssnAddress) {
            Alert('error', "operator address should be bech32 or checksum format");
            return null;
        }

        let delegAmtQa = '';

        if (!delegAmt) {
            Alert('error', "Delegate amount is invalid.");
            return null;
        } else {
            try {
                delegAmtQa = convertZilToQa(delegAmt);
                const isLessThanMinDeleg = new BigNumber(delegAmtQa).isLessThan(minDelegStake);
                

                if (isLessThanMinDeleg) {
                    Alert('error', "Minimum delegate amount is " + minDelegStakeDisplay + " ZIL");
                    return null;
                }

            } catch (err) {
                // user input is malformed
                // cannot convert input zil amount to qa
                Alert('error', "Minimum delegate amount is " + minDelegStakeDisplay + " ZIL");
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
            setDelegAmt('');
            setTxnId('');
        }, 150);
    }

    const handleDelegAmt = (e: any) => {
        setDelegAmt(e.target.value);
    }

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
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
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
                            <input type="text" className="mb-4" value={delegAmt} onChange={handleDelegAmt} placeholder="Enter stake amount in ZIL" />
                            <div className="mb-4">
                                <small><strong>Notes</strong></small>
                                <ul>
                                    <li><small>Minimum staking amount is <strong>{minDelegStakeDisplay}</strong> ZIL.</small></li>
                                    <li><small>Please ensure you have at least <strong>100 ZIL</strong> after staking to pay for gas fees for future transactions such as withdrawal.</small></li>
                                </ul>
                            </div>
                            <div className="d-flex">
                                <button type="button" className="btn btn-user-action mx-auto" onClick={delegateStake}>Stake</button>
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