import React, { useState, useContext} from 'react';
import { AuthContext } from '../contexts/authContext';

function LedgerWallet(props: any) {

    const authContext = useContext(AuthContext);

    const unlockWallet = async () => {
        console.log("unlock by hardware ledger");

        // if no error
        // call parent function to redirect to dashboard
        props.onSuccessCallback();
    }

    return (
        <div className="wallet-access">
            <h2 className="mb-4">Access Wallet using Hardware Ledger</h2>
            <button type="button" className="btn btn-user-action mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
        </div>
    );
}

export default LedgerWallet;