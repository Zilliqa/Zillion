import React, { useState, useContext } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';
import Alert from '../alert';
import { bech32ToChecksum, convertZilToQa } from '../../util/utils';
import { ProxyCalls, OperationStatus, AccessMethod, TransactionType } from '../../util/enum';
import { computeDelegRewards } from '../../util/reward-calculator';

import { fromBech32Address } from '@zilliqa-js/crypto';
const { BN } = require('@zilliqa-js/util');


function ReDelegateStakeModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;
    
    const { 
        proxy,
        impl,
        ledgerIndex,
        networkURL,
        nodeSelectorOptions, 
        transferStakeModalData,
        updateData,
        updateRecentTransactions } = props;

    const userBase16Address = props.userAddress? fromBech32Address(props.userAddress).toLowerCase() : '';

    const fromSsn = transferStakeModalData.ssnAddress; // bech32
    const [toSsn, setToSsn] = useState('');
    const [delegAmt, setDelegAmt] = useState(''); // in ZIL

    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');

    
    // checks if there are any unwithdrawn rewards or buffered deposit
    const hasRewardToWithdraw = async () => {
        const ssnChecksumAddress = bech32ToChecksum(fromSsn).toLowerCase();
        
        const contract = await ZilliqaAccount.getSsnImplContractDirect(impl);

        if (contract === undefined || contract === 'error') {
            return false;
        }

        // compute rewards
        const delegRewards = new BN(await computeDelegRewards(impl, networkURL, ssnChecksumAddress, userBase16Address)).toString();

        if (delegRewards !== "0") {
            Alert('info', "You have unwithdrawn rewards in the selected node. Please withdraw the rewards before transferring.");
            return true;
        }

        // check if user has buffered deposits
        if (contract.last_buf_deposit_cycle_deleg.hasOwnProperty(userBase16Address) &&
            contract.last_buf_deposit_cycle_deleg[userBase16Address].hasOwnProperty(ssnChecksumAddress)) {
                const lastDepositCycleDeleg = parseInt(contract.last_buf_deposit_cycle_deleg[userBase16Address][ssnChecksumAddress]);
                const lastRewardCycle = parseInt(contract.lastrewardcycle);
                if (lastRewardCycle <= lastDepositCycleDeleg) {
                    Alert('info', "You have buffered deposits in the selected node. Please wait for the next cycle before transferring.");
                    return true;
                }
        }

        return false;
    }

    const redeleg = async () => {
        if (!fromSsn || !toSsn) {
            Alert('error', "operator address should be bech32 or checksum format");
            return null;
        }

        if (!delegAmt || !delegAmt.match(/\d/)) {
            Alert('error', "Delegate amount is invalid.");
            return null;
        }

        setIsPending(OperationStatus.PENDING);

        // check if deleg has unwithdrawn rewards or buffered deposits for the from ssn address
        const hasRewards = await hasRewardToWithdraw();
        if (hasRewards) {
            setIsPending('');
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
            amount: new BN(0),
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
        // invoke dashbaord methods
        if (txnId) {
            updateRecentTransactions(TransactionType.TRANSFER_STAKE, txnId);
            updateData();
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setToSsn('');
            setTxnId('');
            setDelegAmt('')
        }, 150);
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
                            <h5 className="modal-title" id="withdrawRewardModalLabel">Transfer Stake</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">

                            <p>{transferStakeModalData.ssnName}</p>
                            <p>{transferStakeModalData.ssnAddress}</p>
                            <p>{transferStakeModalData.delegAmt}</p>
                            
                            <Select 
                                value={
                                    nodeSelectorOptions.filter((option: { label: string; value: string }) => 
                                        option.value === toSsn)
                                    }
                                placeholder="Select an operator to receive the delegated amount"
                                className="node-options-container mb-4"
                                classNamePrefix="node-options"
                                options={nodeSelectorOptions}
                                onChange={handleToAddress}  />

                            <input type="text" className="mb-4" value={delegAmt} onChange={handleDelegAmt} placeholder="Enter amount to transfer in ZIL" />

                            <div className="d-flex mt-4">
                                <button type="button" className="btn btn-user-action mx-auto" onClick={redeleg}>Transfer Stake</button>
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