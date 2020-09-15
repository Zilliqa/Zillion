import React, { useContext, useState } from 'react';
import { ToastContainer } from 'react-toastify';

import AppContext from '../contexts/appContext';
import Alert from './alert';
import { AccessMethod } from '../util/enum';
import { convertQaToCommaStr } from '../util/utils';
import * as ZilliqaAccount from "../account";

import TransportU2F from "@ledgerhq/hw-transport-u2f";
import TransportWebAuthn from "@ledgerhq/hw-transport-webauthn";
import ZilliqaLedger from '../ledger';

import $ from "jquery";


interface LedgerAccount {
    hwIndex: number,
    bech32Address: string,
    balance: string
}

function LedgerWallet(props: any) {

    const appContext = useContext(AppContext);
    const { initParams, updateAuth, updateLedgerIndex, updateRole } = appContext;

    const [ledgerIndex, setLedgerIndex] = useState(0);
    const [selectedLedgerIndex, setSelectedLedgerIndex] = useState(0);
    const [ledgerAccounts, setLedgerAccounts] = useState([] as LedgerAccount[]);

    const role = props.role;

    let transport: import("@ledgerhq/hw-transport").default<string> = null as any;
    let ledger: ZilliqaLedger | null = null;

    const getLedgerAccounts = async () => {
        try {
            const isWebAuthn = await TransportWebAuthn.isSupported();
            if (isWebAuthn) {
                transport = await TransportWebAuthn.create();
            } else {
                transport = await TransportU2F.create();
            }

            ledger = new ZilliqaLedger(transport);

            const result = await ledger!.getPublicAddress(ledgerIndex);
            const currAddress = result.pubAddr;
            const balance = await ZilliqaAccount.getBalance(currAddress);

            const currLedgerAccount: LedgerAccount = {
                hwIndex: ledgerIndex,
                bech32Address: currAddress,
                balance: balance
            }
    
            const tempLedgerAccounts: LedgerAccount [] = ledgerAccounts.slice();
            tempLedgerAccounts.push(currLedgerAccount);
            setLedgerAccounts([...tempLedgerAccounts]);
            setSelectedLedgerIndex(ledgerIndex);
            
            // prepare next ledger index
            const nextLedgerIndex = ledgerIndex + 1;
            setLedgerIndex(nextLedgerIndex);

        } catch (err) {
            console.error("error getting ledger index: %o", ledgerIndex);
            Alert('error', 'There is something wrong with accessing the ledger. Have you unlock the PIN code?');
        }
    }

    const unlockWallet = async (hwIndex: number) => {
        console.log("unlock by hardware ledger");

        if (typeof ledgerAccounts[hwIndex] === undefined) {
            console.error("no such ledger wallet index: %o", hwIndex);
            Alert('error', 'There is something wrong with the selected account. Are you sure it is correct?');
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
            initParams(selectedLedgerAddress, role, AccessMethod.LEDGER);
            await updateRole(selectedLedgerAddress, role);
            updateLedgerIndex(hwIndex);
            updateAuth()

            // no error
            // call parent function to redirect to dashboard
            props.onSuccessCallback();
        } catch (err) {
            console.error("error unlocking ledger...:%o", err);
            Alert('error', 'There is something wrong with accessing the ledger. Have you unlock the PIN code?');
        }
    }

    
    return (
        <div className="wallet-access">
            <h2>Access wallet using Hardware Ledger</h2>
            <div id="ledger-connect-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="ledgerConnectModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                    <div className="modal-content">
                        <div className="modal-body">
                            <table className="table p-4 my-4">
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
                            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={getLedgerAccounts}>Next Account</button>
                            <button type="button" className="btn btn-user-action mx-2" onClick={() => unlockWallet(selectedLedgerIndex)}>Use Default Index #{selectedLedgerIndex}</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <button type="button" className="btn btn-user-action mx-2" data-toggle="modal" data-target="#ledger-connect-modal" data-keyboard="false" data-backdrop="static" onClick={getLedgerAccounts}>Connect to Ledger Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
            <ToastContainer hideProgressBar={true} />
        </div>
    );
}

export default LedgerWallet;