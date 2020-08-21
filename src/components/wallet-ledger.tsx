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
        <div>
            <h2>Load Wallet using Hardware Ledger</h2>
            <button type="button" className="btn btn-success mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-primary mx-2" onClick={props.onReturnCallback}>Back</button>
        </div>
    );
}

export default LedgerWallet;