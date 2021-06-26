import React, { useContext, useState } from 'react';
import AppContext from '../contexts/appContext';
import Alert from './alert';
import { AccountType } from '../util/enum';
import { convertQaToCommaStr } from '../util/utils';
import * as ZilliqaAccount from "../account";

import { LedgerZilliqa } from '../ledger-zilliqa';

import $ from "jquery";


interface LedgerAccount {
    hwIndex: number,
    bech32Address: string,
    balance: string
}

function LedgerWallet(props: any) {

    const appContext = useContext(AppContext);
    const { initParams, updateAuth, updateLedgerIndex, updateRole } = appContext;

    const defaultLedgerIndex = 0;
    const [ledgerIndex, setLedgerIndex] = useState(0);
    const [ledgerAccounts, setLedgerAccounts] = useState([] as LedgerAccount[]);

    const role = props.role;

    const handleClose = () => {
        setLedgerIndex(defaultLedgerIndex);
        setLedgerAccounts([] as LedgerAccount[]);
    }

    const getLedgerAccounts = async (currentLedgerIndex: number) => {
        try {
            Alert('info', "Info", "Please follow the instructions on the device.");
            
            const transport = await LedgerZilliqa.getTransport();
            const ledger = new LedgerZilliqa(transport);

            const result = await ledger!.getPublicAddress(currentLedgerIndex);
            const currAddress = result.pubAddr;
            const balance = await ZilliqaAccount.getBalance(currAddress);

            const currLedgerAccount: LedgerAccount = {
                hwIndex: currentLedgerIndex,
                bech32Address: currAddress,
                balance: balance
            }
    
            const tempLedgerAccounts: LedgerAccount [] = ledgerAccounts.slice();
            tempLedgerAccounts.push(currLedgerAccount);
            setLedgerAccounts([...tempLedgerAccounts]);
            
            setLedgerIndex(currentLedgerIndex);

        } catch (err) {
            console.error("error getting ledger index: %o", err);
            Alert('error', 'Unable to access ledger', 'Have you unlock the PIN code?');
        }
    }

    const unlockWallet = async (hwIndex: number) => {
        console.log("unlock by hardware ledger");

        if (typeof ledgerAccounts[hwIndex] === undefined) {
            console.error("no such ledger wallet index: %o", hwIndex);
            Alert('error', 'Unable to access account', 'Are you sure it is correct?');
            return null;
        }

        try {
            const selectedLedgerAddress = ledgerAccounts[hwIndex].bech32Address;
            // clear modal state
            $("#ledger-connect-modal").modal("hide");

            // show loading state
            props.onWalletLoadingCallback();

            console.log("ledger wallet address: %o", selectedLedgerAddress);
            console.log("ledger wallet index: %o", hwIndex);

            // update context
            initParams(selectedLedgerAddress, AccountType.LEDGER);
            await updateRole(selectedLedgerAddress, role);
            updateLedgerIndex(hwIndex);
            updateAuth()

            // no error
            // call parent function to redirect to dashboard
            props.onSuccessCallback();
        } catch (err) {
            console.error("error unlocking ledger...:%o", err);
            Alert('error', 'Unable to access ledger', 'Have you unlock the PIN code?');

            // clear modal state
            $("#ledger-connect-modal").modal("hide");
            handleClose();
        }
    }

    
    return (
        <div className="wallet-access">
            <h2>Access wallet using Hardware Ledger</h2>
            <div id="ledger-connect-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="ledgerConnectModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <table className="table p-4 mt-2 mb-4">
                                <thead>
                                    <tr>
                                        <th>Index</th>
                                        <th>Address</th>
                                        <th>Balance (ZIL)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { ledgerAccounts && ledgerAccounts.map((item) => 
                                        <tr className="account-row" onClick={() => unlockWallet(item.hwIndex)} key={item.hwIndex}>
                                            <td>#{item.hwIndex}</td>
                                            <td>{item.bech32Address}</td>
                                            <td>{convertQaToCommaStr(item.balance)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={() => getLedgerAccounts(ledgerIndex+1)}>Next Account</button>
                            <button type="button" className="btn btn-user-action mx-2" onClick={() => unlockWallet(defaultLedgerIndex)}>Use Default Index #{defaultLedgerIndex}</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <button type="button" className="btn btn-user-action mx-2" data-toggle="modal" data-target="#ledger-connect-modal" data-keyboard="false" data-backdrop="static" onClick={() => getLedgerAccounts(ledgerIndex)}>Connect to Ledger Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
        </div>
    );
}

export default LedgerWallet;