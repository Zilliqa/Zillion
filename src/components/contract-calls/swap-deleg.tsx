import React, { useState, useContext, useEffect, useCallback } from 'react';
import * as ZilliqaAccount from '../../account';
import { trackPromise } from 'react-promise-tracker';
import { toast } from 'react-toastify';
import { OperationStatus, ProxyCalls, TransactionType } from '../../util/enum';
import { bech32ToChecksum, convertBase16ToBech32, getZillionExplorerLink, showWalletsPrompt } from '../../util/utils';
import Alert from '../alert';
import AppContext from '../../contexts/appContext';
import { toBech32Address, fromBech32Address } from '@zilliqa-js/crypto';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import IconArrowDown from '../icons/arrow-down';
import IconEditBox from '../icons/edit-box-line';
import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';
import ReactTooltip from 'react-tooltip';

const { BN } = require('@zilliqa-js/util');

function SwapDelegModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;
    
    const {proxy, ledgerIndex, networkURL, swapDelegModalData, userAddress, updateData, updateRecentTransactions} = props;
    const proxyChecksum = bech32ToChecksum(proxy);

    // transfer all stakes to this new deleg
    const [newDelegAddr, setNewDelegAddr] = useState('');
    const [txnId, setTxnId] = useState('');
    const [txnType, setTxnType] = useState('');
    const [isPending, setIsPending] = useState('');
    const [isEdit, setIsEdit] = useState(false);

    const cleanUp = () => {
        setNewDelegAddr('');
        setIsPending('');
        setIsEdit(false);
        setTxnId('');
        setTxnType('');
    }

    const handleNewDelegAddr = (e : any) => {
        // TODO: validate addr
        setNewDelegAddr(e.target.value);
    }

    const handleClose = () => {
        // txn success
        // invoke dashboard methods
        if (txnId) {
            updateRecentTransactions(txnType as unknown as TransactionType, txnId);
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

    const requestDelegSwap = async () => {
        if (!newDelegAddr) {
            Alert('error', "Invalid Address", "Wallet address should be bech32 or checksum format.");
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

                        <>
                        <button type="button" className="close btn shadow-none ml-auto mr-3 mt-2" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <Tabs defaultIndex={0}>
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
                                        <div className="modal-label mb-2">Enter new owner address</div>
                                        <div className="input-group mb-2">
                                            <input type="text" className="form-control shadow-none" value={newDelegAddr} onChange={handleNewDelegAddr} />
                                        </div> 
                                        </>
                                        :
                                        null
                                    }

                                    <div className="d-flex mt-3">
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
                                                <button type="button" className="btn btn-user-action-cancel mx-2 shadow-none" onClick={revokeDelegSwap}>Revoke Request</button>
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
                                                        <a href={getZillionExplorerLink(convertBase16ToBech32(requestorAddr))} target="_blank" rel="noopener noreferrer" data-tip data-for="explorer-tip"><IconEditBox width="16" height="16" className="zillion-explorer-link"/></a>
                                                        <div className="float-right btn-contract-group">
                                                            <button type="button" className="btn btn-contract-small shadow-none mx-2" onClick={() => confirmDelegSwap(requestorAddr)}>Accept</button>
                                                            <button type="button" className="btn btn-contract-small-cancel shadow-none mx-2" onClick={() => rejectDelegSwap(requestorAddr)}>Reject</button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))
                                        }
                                    </ul>
                                    <ReactTooltip id="explorer-tip" place="bottom" type="dark" effect="solid">
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