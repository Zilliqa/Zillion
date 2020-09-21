import React, { useState, useContext } from 'react';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';
import Alert from '../alert';
import { bech32ToChecksum, convertZilToQa } from '../../util/utils';
import { ProxyCalls, OperationStatus, AccessMethod } from '../../util/enum';


const { BN } = require('@zilliqa-js/util');

function ReDelegateStakeModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;
    
    const { 
        proxy,
        onSuccessCallback,
        ledgerIndex,
        networkURL,
        nodeSelectorOptions } = props;

    const [fromSsn, setFromSsn] = useState('');
    const [toSsn, setToSsn] = useState('');
    const [delegAmt, setDelegAmt] = useState(''); // in ZIL

    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const redeleg = () => {
        if (!fromSsn || !toSsn) {
            Alert('error', "operator address should be bech32 or checksum format");
            return null;
        }

        if (!delegAmt || !delegAmt.match(/\d/)) {
            Alert('error', "Delegate amount is invalid.");
            return null;
        }

        // create tx params

        // toAddr: proxy address

        const proxyChecksum = bech32ToChecksum(proxy);
        const fromSsnChecksumAddress = bech32ToChecksum(fromSsn).toLowerCase();
        const toSsnChecksumAddress = bech32ToChecksum(toSsn).toLowerCase();
        const delegAmtQa = convertZilToQa(delegAmt);

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(`${delegAmtQa}`),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.REDELEGATE_STAKE,
                params: [
                    {
                        vname: 'ssnaddr',
                        type: 'ByStr20',
                        value: `${fromSsnChecksumAddress}`,
                    },
                    {
                        vname: 'to_ssn',
                        type: 'ByStr20',
                        value: `${toSsnChecksumAddress}`,
                    },
                    {
                        vname: 'amount',
                        type: 'Uint128',
                        value: `${delegAmtQa}`,
                    }
                ]
            })
        };

        setIsPending(OperationStatus.PENDING);

        if (accountType === AccessMethod.LEDGER) {
            Alert('info', "Accessing the ledger device for keys.");
            Alert('info', "Please follow the instructions on the device.");
        }

        if (accountType === AccessMethod.ZILPAY) {
            Alert('info', "Please follow the instructions on ZilPay.");
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
            onSuccessCallback(txnId);
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setFromSsn('');
            setToSsn('');
            setTxnId('');
            setDelegAmt('')
        }, 150);
    }

    const handleFromAddress = (option: any) => {
        setFromSsn(option.value);
    }

    const handleToAddress = (option: any) => {
        setToSsn(option.value);
    }

    const handleDelegAmt = (e: any) => {
        setDelegAmt(e.target.value);
    }

    return (
        <div id="redeleg-stake-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="redelegModalLabel" aria-hidden="true">
            <div className="contract-calls-modal modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    {
                        isPending ?

                        <ModalPending />

                        :

                        txnId ?

                        <ModalSent txnId={txnId} networkURL={networkURL} handleClose={handleClose}/>

                        :

                        <>
                        <div className="modal-header">
                            <h5 className="modal-title" id="withdrawRewardModalLabel">Re-Delegate Stake</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">

                            <Select 
                                placeholder="Select an operator to transfer from"
                                className="node-options-container mb-4"
                                classNamePrefix="node-options"
                                options={nodeSelectorOptions}
                                onChange={handleFromAddress}  />
                            
                            <Select 
                                placeholder="Select an operator to receive the delegated amount"
                                className="node-options-container mb-4"
                                classNamePrefix="node-options"
                                options={nodeSelectorOptions}
                                onChange={handleToAddress}  />

                            <input type="text" className="mb-4" value={delegAmt} onChange={handleDelegAmt} placeholder="Enter amount to redelegate in ZIL" />

                            <div className="d-flex mt-4">
                                <button type="button" className="btn btn-user-action mx-auto" onClick={redeleg}>Re-Stake</button>
                            </div>

                        </div>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}

export default ReDelegateStakeModal;