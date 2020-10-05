import React, { useState, useContext } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import Alert from '../alert';
import { bech32ToChecksum, convertZilToQa, convertQaToCommaStr } from '../../util/utils';
import { OperationStatus, AccessMethod, ProxyCalls, TransactionType } from '../../util/enum';
import { computeDelegRewards } from '../../util/reward-calculator';
import { fromBech32Address } from '@zilliqa-js/crypto';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';


const { BN } = require('@zilliqa-js/util');


function WithdrawStakeModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const proxy = props.proxy;
    const impl = props.impl;
    const networkURL = props.networkURL;
    const ledgerIndex = props.ledgerIndex;
    const { withdrawStakeModalData, updateData, updateRecentTransactions } = props;
    const userBase16Address = props.userAddress ? fromBech32Address(props.userAddress).toLowerCase() : '';

    const ssnAddress = withdrawStakeModalData.ssnAddress; // bech32
    const [withdrawAmt, setWithdrawAmt] = useState(''); // in ZIL
    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');


    // checks if there are any unwithdrawn rewards
    const hasRewardToWithdraw = async () => {
        const ssnChecksumAddress = bech32ToChecksum(ssnAddress).toLowerCase();
        
        const contract = await ZilliqaAccount.getSsnImplContractDirect(impl);

        if (contract === undefined || contract === 'error') {
            return false;
        }

        // compute rewards
        const delegRewards = new BN(await computeDelegRewards(impl, networkURL, ssnChecksumAddress, userBase16Address)).toString();

        if (delegRewards !== "0") {
            console.log("you have delegated rewards: %o", delegRewards);
            Alert('info', "You have unwithdrawn rewards in the selected node. Please withdraw the rewards before withdrawing the staked amount.");
            return true;
        }

        // check if user has buffered deposits
        if (contract.last_buf_deposit_cycle_deleg.hasOwnProperty(userBase16Address) &&
            contract.last_buf_deposit_cycle_deleg[userBase16Address].hasOwnProperty(ssnChecksumAddress)) {
                const lastDepositCycleDeleg = parseInt(contract.last_buf_deposit_cycle_deleg[userBase16Address][ssnChecksumAddress]);
                const lastRewardCycle = parseInt(contract.lastrewardcycle);
                if (lastRewardCycle <= lastDepositCycleDeleg) {
                    Alert('info', "You have buffered deposits in the selected node. Please wait for the next cycle before withdrawing the staked amount.");
                    return true;
                }
        }

        return false;
    }

    const withdrawStake = async () => {
        if (!ssnAddress) {
            Alert('error', "operator address should be bech32 or checksum format");
            return null;
        }

        if (!withdrawAmt || !withdrawAmt.match(/\d/)) {
            Alert('error', "Withdraw amount is invalid.");
            return null;
        }

        setIsPending(OperationStatus.PENDING);

        // check if deleg has unwithdrawn rewards or buffered deposits for this ssn address
        const hasRewards = await hasRewardToWithdraw();
        if (hasRewards) {
            setIsPending('');
            return null;
        }

        // create tx params

        // toAddr: proxy address
        const proxyChecksum = bech32ToChecksum(proxy);
        const ssnChecksumAddress = bech32ToChecksum(ssnAddress).toLowerCase();
        const withdrawAmtQa = convertZilToQa(withdrawAmt);

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.WITHDRAW_STAKE_AMT,
                params: [
                    {
                        vname: 'ssnaddr',
                        type: 'ByStr20',
                        value: `${ssnChecksumAddress}`,
                    },
                    {
                        vname: 'amt',
                        type: 'Uint128',
                        value: `${withdrawAmtQa}`,
                    },
                ]
            })
        };
        
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
        // invoke dashboard methods
        if (txnId) {
            updateRecentTransactions(TransactionType.INITIATE_STAKE_WITHDRAW, txnId);
            updateData();
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setWithdrawAmt('');
            setTxnId('');
        }, 150);
    }

    const handleWithdrawAmt = (e: any) => {
        setWithdrawAmt(e.target.value);
    }

    return (
        <div id="withdraw-stake-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="withdrawStakeModalLabel" aria-hidden="true">
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
                            <h5 className="modal-title" id="withdrawStakeModalLabel">Initiate Stake Withdrawal</h5>
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
                                        <th scope="col">Deposit (ZIL)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{withdrawStakeModalData.ssnName}</td>
                                        <td>{withdrawStakeModalData.ssnAddress}</td>
                                        <td>{convertQaToCommaStr(withdrawStakeModalData.delegAmt)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <input type="text" className="mb-4" value={withdrawAmt} onChange={handleWithdrawAmt} placeholder="Enter withdraw stake amount in ZIL" />
                            <div className="d-flex">
                                <button type="button" className="btn btn-user-action mx-auto mt-2" onClick={withdrawStake}>Initiate</button>
                            </div>
                        </div>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}

export default WithdrawStakeModal;