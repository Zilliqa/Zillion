import React, { useState, useContext } from 'react';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import Alert from '../alert';
import { bech32ToChecksum, convertZilToQa, convertQaToCommaStr, showWalletsPrompt } from '../../util/utils';
import { OperationStatus, ProxyCalls, TransactionType } from '../../util/enum';
import { computeDelegRewards } from '../../util/reward-calculator';
import { fromBech32Address } from '@zilliqa-js/crypto';

import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';


const { BN, units } = require('@zilliqa-js/util');


function WithdrawStakeModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;

    const proxy = props.proxy;
    const impl = props.impl;
    const networkURL = props.networkURL;
    const ledgerIndex = props.ledgerIndex;
    const minDelegStake = props.minDelegStake; // Qa
    const minDelegStakeDisplay = units.fromQa(new BN(minDelegStake), units.Units.Zil);
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

        // corner case check
        // if user has buffered deposits
        // happens if user first time deposit
        // reward is zero but contract side warn has unwithdrawn rewards
        // user cannot withdraw zero rewards from UI
        if (contract.buff_deposit_deleg.hasOwnProperty(userBase16Address) &&
            contract.buff_deposit_deleg[userBase16Address].hasOwnProperty(ssnChecksumAddress)) {
                const buffDepositMap: any = contract.buff_deposit_deleg[userBase16Address][ssnChecksumAddress];
                const lastCycleDelegNum = Object.keys(buffDepositMap).sort().pop() || '0';
                const lastRewardCycle = parseInt(contract.lastrewardcycle);

                if (lastRewardCycle < parseInt(lastCycleDelegNum + 2)) {
                    // deposit still in buffer 
                    // have to wait for 2 cycles to receive rewards to clear buffer
                    Alert('info', "You have buffered deposits in the selected node. Please wait for 2 more cycles for your rewards to be issued before withdrawing.");
                    return true;
                }
        }

        return false;
    }

    const withdrawStake = async () => {
        let withdrawAmtQa;

        if (!ssnAddress) {
            Alert('error', "operator address should be bech32 or checksum format");
            return null;
        }

        if (!withdrawAmt) {
            Alert('error', "Withdraw amount is invalid.");
            return null;
        } else {
            try {
                withdrawAmtQa = convertZilToQa(withdrawAmt);
            } catch (err) {
                // user input is malformed
                // cannot convert input zil amount to qa
                Alert('error', "Withdraw amount is invalid.");
                return null;
            }
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
        const delegAmtQa = withdrawStakeModalData.delegAmt;
        const leftOverQa = new BN(delegAmtQa).sub(new BN(withdrawAmtQa));

        // check if withdraw more than delegated
        if (new BN(withdrawAmtQa).gt(new BN(delegAmtQa))) {
            Alert('info', "You only have " + convertQaToCommaStr(delegAmtQa) + " ZIL to withdraw." );
            setIsPending('');
            return null;
        } else if (!leftOverQa.isZero() && leftOverQa.lt(new BN(minDelegStake))) {
            // check leftover amount
            // if less than min stake amount
            Alert('info', "Please leave at least " +  minDelegStakeDisplay + " ZIL (min. stake amount) or withdraw ALL.");
            setIsPending('');
            return null;
        }

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
        
        showWalletsPrompt(accountType);

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
                            <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel mr-4">
                                    <h3>{withdrawStakeModalData.ssnName}</h3>
                                    <span>{withdrawStakeModalData.ssnAddress}</span>
                                </div>
                                <div className="col node-details-panel">
                                    <h3>Deposit</h3>
                                    <span>{convertQaToCommaStr(withdrawStakeModalData.delegAmt)} ZIL</span>
                                </div>
                            </div>
                            <div className="input-group mb-4">
                                <input type="text" className="form-control shadow-none" value={withdrawAmt} onChange={handleWithdrawAmt} placeholder="Enter stake amount to withdraw" />
                                <div className="input-group-append">
                                    <span className="input-group-text pl-4 pr-3">ZIL</span>
                                </div>
                            </div>
                            <div className="d-flex">
                                <button type="button" className="btn btn-user-action mx-auto mt-2 shadow-none" onClick={withdrawStake}>Initiate</button>
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