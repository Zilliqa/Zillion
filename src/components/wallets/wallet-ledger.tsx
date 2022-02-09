import React, { useEffect, useState } from "react";
import { LedgerZilliqa } from "../../ledger-zilliqa";
import { AccountType } from "../../util/enum";
import { logger } from "../../util/logger";
import { bech32ToChecksum, convertQaToCommaStr } from "../../util/utils";
import { ZilSdk } from "../../zilliqa-api";
import Alert from "../alert";

interface LedgerAccount {
    hwIndex: number,
    bech32Address: string,
    balance: string
}

function WalletLedgerModal(props: any) {
    const defaultLedgerIndex = 0;
    const [ledgerIndex, setLedgerIndex] = useState(0);
    const [ledgerAccounts, setLedgerAccounts] = useState([] as LedgerAccount[]);
    const [loading, setLoading] = useState(false);


    const reset = () => {
        setLedgerIndex(defaultLedgerIndex);
        setLedgerAccounts([] as LedgerAccount[]);
        setLoading(false);
    }

    const handleClose = () => {
        reset();
        props.toggleWalletSelection('');
    }

    const getLedgerAccounts = async (currentLedgerIndex: number) => {
        try {
            if (ledgerAccounts.length === 0) {
                Alert('info', "Info", "Please unlock the ledger. Pair it and select the address on your ledger.");
            } else {
                Alert('info', "Info", "Please follow the instructions on the device.");
            }
            
            const transport = await LedgerZilliqa.getTransport();
            const ledger = new LedgerZilliqa(transport);

            const result = await ledger!.getPublicAddress(currentLedgerIndex);
            const currAddress = result.pubAddr;
            const balance = await ZilSdk.getBalance(currAddress);

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
            return;
        }
    }

    const unlockWallet = (hwIndex: number) => {
        logger("unlock by hardware ledger");

        if (typeof ledgerAccounts[hwIndex] === undefined) {
            console.error("no such ledger wallet index: %o", hwIndex);
            Alert('error', 'Unable to access account', 'Are you sure it is correct?');
            return null;
        }

        setLoading(true);

        try {
            const selectedLedgerAddress = ledgerAccounts[hwIndex].bech32Address;

            logger("ledger wallet address: %o", selectedLedgerAddress);
            logger("ledger wallet index: %o", hwIndex);

            const base16Address = bech32ToChecksum(selectedLedgerAddress).toLowerCase();

            // invoke redux saga to save user info
            props.onUpdateUserInfo(base16Address.toLowerCase(), selectedLedgerAddress, AccountType.KEYSTORE);

            // request parent to redirect to dashboard
            props.goToDashboard();

        } catch (err) {
            console.error("error unlocking ledger...:%o", err);
            reset();
            Alert('error', 'Unable to access ledger', 'Have you unlock the PIN code?');
            return;
        }
    }

    useEffect(() => {
        reset();

        const getFirstLedgerAccount = async () => {
            await getLedgerAccounts(defaultLedgerIndex);
         }

         if (props.isToggleWalletSelection === AccountType.LEDGER) {
            getFirstLedgerAccount();
         }
    }, [props.isToggleWalletSelection])
    
    return (
        <div 
            id="wallet-ledger-modal"
            className="modal fade"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="walletLedgerModal"
            aria-hidden="true"
            data-keyboard={ loading ? "false" : "true" }
            data-backdrop={ loading ? "static" : "true" }>
                <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                        <h5 className="modal-title" id="walletLedgerModal">Ledger Connect</h5>
                            {
                                loading

                                ?

                                null

                                :

                                <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            }
                        </div>
                        <div className="modal-body">
                            {
                                loading 
                                
                                ?

                                <div className="wallet-access text-center">
                                    <h2>Retrieving ledger wallet info...</h2>
                                    <div className="spinner-border dashboard-spinner" role="status">
                                    <span className="sr-only">Loading...</span>
                                    </div>
                                </div>

                                :

                                <>
                                <table className="table text-center p-4 mt-2 mb-4">
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
                                <div className="text-center">
                                    <button type="button" className="btn btn-user-action-cancel mx-2" onClick={() => getLedgerAccounts(ledgerIndex+1)}>Next Account</button>
                                    <button type="button" className="btn btn-user-action mx-2" onClick={() => unlockWallet(defaultLedgerIndex)}>Use Default Index #{defaultLedgerIndex}</button>
                                </div>
                                </>
                            }
                        </div>
                    </div>
                </div>
        </div>
    )
}

export default WalletLedgerModal;