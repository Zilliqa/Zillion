import React, { useState, useContext, useEffect, useCallback } from 'react';
import * as ZilliqaAccount from '../../account';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';
import { OperationStatus, ProxyCalls, TransactionType } from '../../util/enum';
import { bech32ToChecksum, convertBase16ToBech32, getTruncatedAddress, getZillionExplorerLink, showWalletsPrompt } from '../../util/utils';
import Alert from '../alert';
import AppContext from '../../contexts/appContext';
import { toBech32Address, fromBech32Address } from '@zilliqa-js/crypto';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import IconArrowDown from '../icons/arrow-down';
import IconEditBox from '../icons/edit-box-line';
import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';
import ReactTooltip from 'react-tooltip';
import { computeDelegRewardsRetriable } from '../../util/reward-calculator';

const { BN, validation } = require('@zilliqa-js/util');

function SwapDelegModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;
    
    const {proxy, impl, ledgerIndex, networkURL, swapDelegModalData, userAddress, updateData, updateRecentTransactions} = props;
    const proxyChecksum = bech32ToChecksum(proxy);

    // transfer all stakes to this new deleg
    const [newDelegAddr, setNewDelegAddr] = useState(''); // bech32
    const [selectedDelegAddr, setSelectedDelegAddr] = useState(''); // base16; used in incoming requests tab to track the address being accepted or rejected
    const [txnId, setTxnId] = useState('');
    const [txnType, setTxnType] = useState('');
    const [tabIndex, setTabIndex] = useState(0);
    const [isPending, setIsPending] = useState('');
    const [isEdit, setIsEdit] = useState(false);
    
    const [showConfirmRevokeBox, setShowConfirmRevokeBox] = useState(false);
    const [showConfirmSwapBox, setShowConfirmSwapBox] = useState(false);
    const [showConfirmRejectBox, setShowConfirmRejectBox] = useState(false);

    const cleanUp = () => {
        setNewDelegAddr('');
        setSelectedDelegAddr('');
        setTabIndex(0);
        setIsPending('');
        setIsEdit(false);
        setTxnId('');
        setTxnType('');
        setShowConfirmRevokeBox(false);
        setShowConfirmSwapBox(false);
        setShowConfirmRejectBox(false);
    }

    const validateAddress = (address: string) => {
        if (!address || address === "" || (!validation.isAddress(address) && !validation.isBech32(address)) ) {
            return false;
        }
        return true;
    }

    const handleNewDelegAddr = (e : any) => {
        let address = e.target.value;
        if (address && (validation.isAddress(address) || validation.isBech32(address)) ) {
            address = toBech32Address(bech32ToChecksum(address))
        }
        setNewDelegAddr(address);
    }

    const toggleConfirmSwapBox = (address : string) => {
        setSelectedDelegAddr(address);
        setShowConfirmSwapBox(true);
    }

    const toggleRejectSwapBox = (address : string) => {
        setSelectedDelegAddr(address);
        setShowConfirmRejectBox(true);
    }

    const handleClose = () => {
        // txn success
        // invoke dashboard methods
        if (txnId) {
            let convertedTxnType;
            switch (txnType) {
                case TransactionType.REQUEST_DELEG_SWAP.toString():
                    convertedTxnType = TransactionType.REQUEST_DELEG_SWAP;
                    break;
                case TransactionType.REVOKE_DELEG_SWAP.toString():
                    convertedTxnType = TransactionType.REVOKE_DELEG_SWAP;
                    break;
                case TransactionType.CONFIRM_DELEG_SWAP.toString():
                    convertedTxnType = TransactionType.CONFIRM_DELEG_SWAP;
                    break;
                case TransactionType.REJECT_DELEG_SWAP.toString():
                    convertedTxnType = TransactionType.REJECT_DELEG_SWAP;
                    break;
            }
            updateRecentTransactions(convertedTxnType, txnId);
            updateData();
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            cleanUp();
        }, 150);
    }

    const sendTxn = (txnType: TransactionType, txParams: any) => {
        // set txn type to store in cookie
        setTxnType(txnType.toString());
        setIsPending(OperationStatus.PENDING);

        showWalletsPrompt(accountType);

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams, ledgerIndex)
        .then((result) => {
            if (result === OperationStatus.ERROR) {
                Alert('error', "Transaction Error", "Please try again.");
            } else {
                setTxnId(result);
            }
        }).finally(() => {
            setIsPending('');
        }));
    }

    const confirmDelegSwap = async (requestorAddr: string) => {
        console.log("CONFIRM SWAP: %o\n", requestorAddr);

        setIsPending(OperationStatus.PENDING);

        const requestorHasBuffOrRewards = await hasBufferedOrRewards(requestorAddr);
        if (requestorHasBuffOrRewards) {
            // requestor has buffered deposits or rewards
            setIsPending('');
            return null;
        }

        // userAddress here is the new delegator waiting to receive
        const newDelegHasBuffOrRewards = await hasBufferedOrRewards(userAddress);
        if (newDelegHasBuffOrRewards) {
            setIsPending('');
            return null;
        }

        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.CONFIRM_DELEG_SWAP,
                params: [
                    {
                        vname: 'requestor',
                        type: 'ByStr20',
                        value: `${requestorAddr}`,
                    }
                ]
            })
        };

        sendTxn(TransactionType.CONFIRM_DELEG_SWAP, txParams);
    }

    const rejectDelegSwap = async (requestorAddr: string) => {
        console.log("REJECT DELEG: %o\n", requestorAddr);
        
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.REJECT_DELEG_SWAP,
                params: [
                    {
                        vname: 'requestor',
                        type: 'ByStr20',
                        value: `${requestorAddr}`,
                    }
                ]
            })
        };

        sendTxn(TransactionType.REJECT_DELEG_SWAP, txParams);
    }

    // returns true if address is ok
    // otherwise returns false
    // @param swapAddr: bech32 format
    const isValidSwap = (swapAddr: string) => {
        // check if it is self swap
        if (userAddress === swapAddr) {
            Alert('error', "Invalid New Owner", "Please enter another wallet address other than the connected wallet.");
            return false;
        }

        // check if it is cyclic, i.e. if B -> X, where X == A exists
        let byStr20SwapAddr = fromBech32Address(swapAddr).toLowerCase();
        console.log("bystr20: %o\n", byStr20SwapAddr);
        console.log(swapDelegModalData.requestorList);
        if (swapDelegModalData.requestorList.includes(byStr20SwapAddr)) {
            let msg = `There is an existing request from ${getTruncatedAddress(swapAddr)}. Please accept or reject the incoming request first.`;
            Alert('error', "Invalid New Owner", msg);
            return false;
        }

        return true;
    }

    // check if address has buffered deposits or unwithdrawn rewards
    // returns true if the address has buffered deposits or rewards, otherwise returns false
    // @param address: bech32 format
    const hasBufferedOrRewards = async (address: string) => {
        let wallet = fromBech32Address(address).toLowerCase();
        let displayAddr = getTruncatedAddress(address);

        const lrc = await ZilliqaAccount.getImplStateExplorerRetriable(impl, networkURL, "lastrewardcycle");
        const lbdc = await  ZilliqaAccount.getImplStateExplorerRetriable(impl, networkURL, "last_buf_deposit_cycle_deleg", [wallet]);
        const deposit_amt_deleg_map = await ZilliqaAccount.getImplStateExplorerRetriable(impl, networkURL, "deposit_amt_deleg", [wallet]);
        const buff_deposit_deleg_map = await ZilliqaAccount.getImplStateExplorerRetriable(impl, networkURL, "buff_deposit_deleg", [wallet]);
        
        if (lrc === undefined || lrc === "error") {
            return false;
        }

        if (lbdc === undefined || lbdc === "error") {
            return false;
        }

        if (deposit_amt_deleg_map === undefined || deposit_amt_deleg_map === "error") {
            return false;
        }

        if (buff_deposit_deleg_map === undefined || buff_deposit_deleg_map === "error") {
            return false;
        }

        let ssnlist = deposit_amt_deleg_map["deposit_amt_deleg"][wallet];
        for (let ssnAddress in ssnlist) {
            // check rewards
            const rewards = new BN(await computeDelegRewardsRetriable(impl, networkURL, ssnAddress, wallet));
            if (rewards !== "0") {
                let msg = `${displayAddr} has unwithdrawn rewards. Please withdraw or wait until the user has withdrawn the rewards before continuing.`
                Alert('info', "Unwithdrawn Rewards Found", msg);
                return true;
            }

            const lrc_o = parseInt(lrc["lastrewardcycle"]);

            // check buffered deposits
            if (lbdc["last_buf_deposit_cycle_deleg"][wallet].hasOwnProperty(ssnAddress)) {
                const ldcd = parseInt(lbdc["last_buf_deposit_cycle_deleg"][wallet][ssnAddress]);
                if (lrc_o <= ldcd) {
                    let msg = `${displayAddr} has buffered deposits. Please wait for the next cycle before continuing.`
                    Alert('info', "Buffered Deposits Found", msg);
                    return true;
                }
            }

            // check buffered deposits (lrc-1)
            let lrc_o_minus = lrc_o - 1
            if (lrc_o_minus >= 0) {
                if (buff_deposit_deleg_map["buff_deposit_deleg"][wallet].hasOwnProperty(ssnAddress)) {
                    if (buff_deposit_deleg_map["buff_deposit_deleg"][wallet][ssnAddress].hasOwnProperty(lrc_o_minus)) {
                        let msg = `${displayAddr} has buffered deposits. Please wait for the next cycle before continuing.`
                        Alert('info', "Buffered Deposits Found", msg);
                        return true;
                    }
                }
            }

        }
        return false;
    }

    // check if address has staked with some ssn
    // returns false if address has not stake; otherwise returns true
    const hasStaked = async (address: string) => {
        console.log("has staked")
        let wallet = fromBech32Address(address).toLowerCase();

        const deposit_amt_deleg_map = await ZilliqaAccount.getImplStateExplorerRetriable(impl, networkURL, "deposit_amt_deleg", [wallet]);

        console.log("deposit amt deleg: %o\n", deposit_amt_deleg_map);

        if (deposit_amt_deleg_map === undefined || deposit_amt_deleg_map === "error" || deposit_amt_deleg_map.length === 0) {
            console.log("has staked return false");
            return false;
        }

        return true;
    }

    const requestDelegSwap = async () => {

        if (!validateAddress(newDelegAddr)) {
            Alert('error', "Invalid Address", "Wallet address should be bech32 or checksum format.");
            return null;
        }

        if (!isValidSwap(newDelegAddr)) {
            return null;
        }

        const userHasStaked = await hasStaked(userAddress);
        if (!userHasStaked) {
            Alert('info', "User Has No Stake", `You have not stake with any operators.`);
            return null;
        }

        setIsPending(OperationStatus.PENDING);

        const userHasBuffOrRewards = await hasBufferedOrRewards(userAddress);
        if (userHasBuffOrRewards) {
            // user has buffered deposits or rewards
            setIsPending('');
            return null;
        }

        const newDelegHasBuffOrRewards = await hasBufferedOrRewards(newDelegAddr);
        if (newDelegHasBuffOrRewards) {
            setIsPending('');
            return null;
        }

        console.log("new deleg addr: %o", newDelegAddr)

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.REQUEST_DELEG_SWAP,
                params: [
                    {
                        vname: 'new_deleg_addr',
                        type: 'ByStr20',
                        value: `${fromBech32Address(newDelegAddr)}`,
                    }
                ]
            })
        };

        sendTxn(TransactionType.REQUEST_DELEG_SWAP, txParams);
    }

    const revokeDelegSwap = async () => {
        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.REVOKE_DELEG_SWAP,
                params: []
            })
        };

        sendTxn(TransactionType.REVOKE_DELEG_SWAP, txParams);
    }

    return (
        <div id="swap-deleg-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="swapDelegModalLabel" aria-hidden="true">
            <div className="contract-calls-modal modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    {
                        isPending ?
                        
                        <ModalPending/>

                        :

                        txnId ?

                        <ModalSent txnId={txnId} networkURL={networkURL} handleClose={handleClose}/>

                        :

                        showConfirmRevokeBox ?

                        <div className="modal-body">
                            <h5 className="modal-title mb-4">Revoke Confirmation</h5>
                            <p>Are you sure you want to revoke the existing transfer ownership request?</p>
                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel">
                                    <h3>Pending New Owner To Accept</h3>
                                    <span>{convertBase16ToBech32(swapDelegModalData.swapRecipientAddress)}</span>
                                </div>
                            </div>
                            <div className="d-flex mt-4">
                                <div className="mx-auto">
                                    <button type="button" className="btn btn-user-action mx-2 shadow-none" onClick={revokeDelegSwap}>
                                        Yes
                                    </button>
                                    <button type="button" className="btn btn-user-action-cancel mx-2 shadow-none" onClick={() => setShowConfirmRevokeBox(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>

                        :

                        showConfirmRejectBox ?

                        <div className="modal-body">
                            <h5 className="modal-title mb-4">Reject Confirmation</h5>
                            <p>Are you sure you wish to <em>reject</em> the transfer request?</p>

                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel">
                                    <h3>Requestor's Wallet</h3>
                                    <span>{convertBase16ToBech32(selectedDelegAddr)}</span>
                                    <a href={getZillionExplorerLink(convertBase16ToBech32(selectedDelegAddr))} target="_blank" rel="noopener noreferrer" data-tip data-for="explorer-tip"><IconEditBox width="16" height="16" className="zillion-explorer-link"/></a>
                                    <ReactTooltip id="explorer-tip" place="bottom" type="dark" effect="solid">
                                        <span>View Wallet on Zillion Explorer</span>
                                    </ReactTooltip>
                                </div>
                            </div>

                            <div className="mb-4">
                                <small><strong>Notes</strong></small>
                                <ul>
                                    <li><small>By clicking on <em>'Yes'</em>, you are rejecting the transfer request and would not receive the stakes and rewards from the requestor's wallet.</small></li>
                                </ul>
                            </div>

                            <div className="d-flex mt-4">
                                <div className="mx-auto">
                                    <button type="button" className="btn btn-user-action mx-2 shadow-none" onClick={() => rejectDelegSwap(selectedDelegAddr)}>
                                        Yes
                                    </button>
                                    <button type="button" className="btn btn-user-action-cancel mx-2 shadow-none" onClick={() => setShowConfirmRejectBox(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>

                        :

                        showConfirmSwapBox ?

                        <div className="modal-body">
                            <h5 className="modal-title mb-4">Accept Confirmation</h5>
                            <p>Are you sure you wish to <em>accept</em> all the stakes and rewards from this wallet?</p>

                            <div className="row node-details-wrapper mb-4">
                                <div className="col node-details-panel">
                                    <h3>Requestor's Wallet</h3>
                                    <span>{convertBase16ToBech32(selectedDelegAddr)}</span>
                                    <a href={getZillionExplorerLink(convertBase16ToBech32(selectedDelegAddr))} target="_blank" rel="noopener noreferrer" data-tip data-for="explorer-tip"><IconEditBox width="16" height="16" className="zillion-explorer-link"/></a>
                                    <ReactTooltip id="explorer-tip" place="bottom" type="dark" effect="solid">
                                        <span>View Wallet on Zillion Explorer</span>
                                    </ReactTooltip>
                                </div>
                            </div>

                            <div className="mb-4">
                                <small><strong>Notes</strong></small>
                                <ul>
                                    <li><small>By clicking on <em>'Yes'</em>, all the stakes and rewards are transferred from the requestor's wallet to your wallet.</small></li>
                                    <li><small>This transfer process is <strong>non-reversible.</strong></small></li>
                                </ul>
                            </div>

                            <div className="d-flex mt-4">
                                <div className="mx-auto">
                                    <button type="button" className="btn btn-user-action mx-2 shadow-none" onClick={() => confirmDelegSwap(selectedDelegAddr)}>
                                        Yes
                                    </button>
                                    <button type="button" className="btn btn-user-action-cancel mx-2 shadow-none" onClick={() => setShowConfirmSwapBox(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>

                        :

                        <>
                        <button type="button" className="close btn shadow-none ml-auto mr-3 mt-2" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)}>
                            <TabList>
                                <Tab>Change Stake Ownership</Tab>
                                <Tab>Incoming Requests</Tab>
                            </TabList>

                            <TabPanel>
                                <div className="modal-body">
                                    {
                                        swapDelegModalData.swapRecipientAddress 
                                        ?
                                        <div className="row node-details-wrapper mb-4">
                                            <div className="col node-details-panel">
                                                <h3>Pending New Owner To Accept</h3>
                                                <span>{userAddress} (Connected Wallet)</span>
                                                <br/>
                                                <IconArrowDown width="16" height="16" className="swap-icon mt-2 mb-2"/>
                                                <br/>
                                                <span>{convertBase16ToBech32(swapDelegModalData.swapRecipientAddress)} (New Owner)</span>
                                            </div>
                                        </div>
                                        :
                                        null
                                    }

                                    
                                    {
                                        // show new address form if editing or no swap recipient
                                        (isEdit || !swapDelegModalData.swapRecipientAddress)
                                        ?
                                        <>
                                        <div className="modal-label mb-2">Enter new owner address<br/>(in bech32 format e.g. zil1xxxxxxxxxxxxx)</div>
                                        <div className="input-group mb-2">
                                            <input type="text" className="form-control shadow-none" value={newDelegAddr} onChange={handleNewDelegAddr} />
                                        </div> 
                                        </>
                                        :
                                        null
                                    }

                                    <div className="d-flex mt-4">
                                        {
                                            swapDelegModalData.swapRecipientAddress
                                            ?
                                            <div className="mx-auto">
                                                {
                                                    isEdit
                                                    ?
                                                    // allow users to send the modified address
                                                    <button type="button" className="btn btn-user-action mx-2 shadow-none" onClick={requestDelegSwap}>Send Request</button>
                                                    :
                                                    <button type="button" className="btn btn-user-action mx-2 shadow-none" onClick={() => setIsEdit(true)}>Edit Request</button>
                                                }
                                                <button type="button" className="btn btn-user-action-cancel mx-2 shadow-none" onClick={() => setShowConfirmRevokeBox(true)}>Revoke Request</button>
                                            </div>
                                            :
                                            // show new owner form
                                            <button type="button" className="btn btn-user-action mx-auto shadow-none" onClick={requestDelegSwap}>Send Request</button>
                                        }
                                    </div>
                                </div>
                            </TabPanel>

                            <TabPanel>
                                {
                                    swapDelegModalData.requestorList.length === 0
                                    ?
                                    <div className="swap-deleg-requestor-list m-4">
                                        <p>You have no incoming requests.</p>
                                    </div>
                                    :
                                    <>
                                    <ul className="p-3 list-unstyled swap-deleg-requestor-list">
                                        {
                                            swapDelegModalData.requestorList.map((requestorAddr: string, index: number) => (
                                                <li key={index}>
                                                    <div className="flex mb-2">
                                                        <span>{convertBase16ToBech32(requestorAddr)}</span>
                                                        <a href={getZillionExplorerLink(convertBase16ToBech32(requestorAddr))} target="_blank" rel="noopener noreferrer" data-tip data-for="explorer-tip2"><IconEditBox width="16" height="16" className="zillion-explorer-link"/></a>
                                                        <div className="float-right btn-contract-group">
                                                            <button type="button" className="btn btn-contract-small shadow-none mx-2" onClick={() => toggleConfirmSwapBox(requestorAddr)}>Accept</button>
                                                            <button type="button" className="btn btn-contract-small-cancel shadow-none mx-2" onClick={() => toggleRejectSwapBox(requestorAddr)}>Reject</button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))
                                        }
                                    </ul>
                                    <ReactTooltip id="explorer-tip2" place="bottom" type="dark" effect="solid">
                                        <span>View Wallet on Zillion Explorer</span>
                                    </ReactTooltip>
                                    </>
                                }

                            </TabPanel>
                        </Tabs>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}

export default SwapDelegModal;