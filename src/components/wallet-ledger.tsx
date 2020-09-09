import React, { useContext } from 'react';
import { ToastContainer } from 'react-toastify';

import AppContext from '../contexts/appContext';
import Alert from './alert';
import { AccessMethod } from '../util/enum';

import TransportU2F from "@ledgerhq/hw-transport-u2f";
import TransportWebAuthn from "@ledgerhq/hw-transport-webauthn";
import ZilliqaLedger from '../ledger';


function LedgerWallet(props: any) {

    const appContext = useContext(AppContext);
    const { initParams, updateAuth, updateRole } = appContext;

    const role = props.role;

    const unlockWallet = async () => {
        console.log("unlock by hardware ledger");

        try {
            let transport = null;
            const isWebAuthn = await TransportWebAuthn.isSupported();
            if (isWebAuthn) {
                console.log("webauthn is supported");
                transport = await TransportWebAuthn.create();
            } else {
                transport = await TransportU2F.create();
            }

            const ledger = new ZilliqaLedger(transport);
            Alert('info', "Please confirm action on Ledger Device.")

            const result = await ledger.getPublicAddress(0);
            console.log("unlock ledger success - public address...: %o", result.pubAddr);
            // show loading state
            props.onWalletLoadingCallback();

            // update context
            initParams(result.pubAddr, role, AccessMethod.LEDGER);
            await updateRole(result.pubAddr, role);
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
            <h2 className="mb-4">Access Wallet using Hardware Ledger</h2>
            <button type="button" className="btn btn-user-action mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
            <ToastContainer hideProgressBar={true} />
        </div>
    );
}

export default LedgerWallet;