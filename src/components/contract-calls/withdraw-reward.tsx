import React, { useState, useContext, useCallback, useEffect } from 'react';
import Select from 'react-select';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import Alert from '../alert';
import { bech32ToChecksum } from '../../util/utils';
import { OperationStatus, AccessMethod, ProxyCalls } from '../../util/enum';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';

import { fromBech32Address } from '@zilliqa-js/crypto';
import { computeDelegRewards } from '../../util/reward-calculator';
const { BN } = require('@zilliqa-js/util');


interface NodeOptions {
    label: string,
    value: string,
}

function WithdrawRewardModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const proxy = props.proxy;
    const impl = props.impl;
    const ledgerIndex = props.ledgerIndex;
    const networkURL = props.networkURL;
    const { onSuccessCallback } = props;

    const userBase16Address = fromBech32Address(props.userAddress).toLowerCase();

    const nodeSelectorOptions = props.nodeSelectorOptions;
    const [nodeOptions, setNodeoptions] = useState([] as NodeOptions[]);

    const [ssnAddress, setSsnAddress] = useState(''); // checksum address
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
            onSuccessCallback(txnId);
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setSsnAddress('');
            setTxnId('');
        }, 150);
    }

    const handleChange = (option: any) => {
        console.log(option.value);
        setSsnAddress(option.value);
    }

    const filterNodeOptions = useCallback(async () => {
        let nodeOptions: NodeOptions[] = [];
        const contractState = await ZilliqaAccount.getImplState(impl, "deposit_amt_deleg");
        
        if (contractState === undefined || contractState === 'error') {
            return null;
        }

        const depositDelegList = contractState.deposit_amt_deleg[userBase16Address];
        // loop the label, value pair parsed from dashboard
        nodeSelectorOptions.forEach(async (item: { label: string, value: string; }) => {
            const ssnAddress = item.value;
            if (ssnAddress in depositDelegList) {
                const delegRewards = new BN(await computeDelegRewards(impl, networkURL, ssnAddress, userBase16Address)).toString();

                if (delegRewards && delegRewards !== '0') {
                    nodeOptions.push(item);
                }
            }
        })

        setNodeoptions([...nodeOptions]);

    }, [impl, networkURL, nodeSelectorOptions, userBase16Address]);

    // filter node options
    // show only those that have been delegated by user and have rewards
    useEffect(() => {
        filterNodeOptions();
    }, [filterNodeOptions]);

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
                            <Select 
                                value={
                                    nodeOptions.filter((option: { label: string; value: string }) => 
                                        option.value === ssnAddress)
                                    }
                                placeholder="Select an operator to claim the rewards"
                                className="node-options-container mb-4"
                                classNamePrefix="node-options"
                                options={nodeOptions}
                                onChange={handleChange}  />
                            <div className="d-flex">
                                <button type="button" className="btn btn-user-action mx-auto" onClick={withdrawReward}>Claim</button>
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