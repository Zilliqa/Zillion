import React, { useState, useContext } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { ToastContainer, toast } from 'react-toastify';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import Alert from '../alert';
import { bech32ToChecksum, convertZilToQa } from '../../util/utils';
import { OperationStatus, AccessMethod, ProxyCalls } from '../../util/enum';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

const { BN } = require('@zilliqa-js/util');


function DelegateStakeModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const proxy = props.proxy;
    const networkURL = props.networkURL;
    const { onSuccessCallback } = props;

    const [ssnAddress, setSsnAddress] = useState(''); // checksum address
    const [delegAmt, setDelegAmt] = useState(''); // in ZIL
    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    const delegateStake = async () => {
        if (!ssnAddress) {
            Alert('error', "operator address should be bech32 or checksum format");
            return null;
        }

        if (!delegAmt || !delegAmt.match(/\d/)) {
            Alert('error', "Delegate amount is invalid.");
            return null;
        }
        // create tx params

        // toAddr: proxy address
        // amount: amount in Qa to stake
        console.log("ssn address: %o", ssnAddress);
        console.log("proxy: %o", proxy);

        const proxyChecksum = bech32ToChecksum(proxy);
        const ssnChecksumAddress = bech32ToChecksum(ssnAddress);
        const delegAmtQa = convertZilToQa(delegAmt);

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

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams)
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
            setSsnAddress('');
            setDelegAmt('');
            setTxnId('');
        }, 150);
    }

    const handleDelegAmt = (e: any) => {
        setDelegAmt(e.target.value);
    }

    const handleSsnAddress = (e: any) => {
        setSsnAddress(e.target.value);
    }

    return (
        <div id="delegate-stake-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="delegateStakeModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
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
                            <h5 className="modal-title" id="delegateStakeModalLabel">Delegate Stake</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <input type="text" className="form-control mb-4" value={ssnAddress} onChange={handleSsnAddress} placeholder="Enter ssn bech32 address" />
                            <input type="text" className="form-control mb-4" value={delegAmt} onChange={handleDelegAmt} placeholder="Enter delegate amount in ZIL" />
                            <button type="button" className="btn btn-user-action mr-2" onClick={delegateStake}>Stake</button>
                            <button type="button" className="btn btn-user-action-cancel mx-2" data-dismiss="modal" onClick={handleClose}>Cancel</button>
                        </div>
                         </>
                     }
                 </div>
            </div>
            <ToastContainer hideProgressBar={true}/>
        </div>
    );
}

export default DelegateStakeModal;