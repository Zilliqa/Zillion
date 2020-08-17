import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/authContext';
import * as Account from '../account';

function MnemonicWallet(props: any) {

    const authContext = useContext(AuthContext);
    const [mnemonic, setMnemonic] = useState('');
    const [error, setError] = useState('');

    const handleError = () => {
        setError('error');
    }

    const handleMnemonic = (e: any) => {
        setMnemonic(e.target.value);
    }

    const unlockWallet = async () => {
        console.log("unlock by mnemonic");
        console.log("mnemonic: %o", mnemonic);
        const address = await Account.addWalletByMnemonic(mnemonic);

        if (address !== "error") {
            console.log("wallet add success: %o", address);
            authContext.toggleAuthentication(address);
            // no error
            // call parent function to redirect to dashboard
            props.onSuccessCallback();
        } else {
            handleError();
        }
    };

    return (
        <div>
            <h2>Load Wallet using Mnemonic Phrase</h2>
            <p className="lead">Simple implmentation without password</p>
            { error ? <p>There is something wrong in decrypting. Please ensure there are no carriage returns.</p> : null }
            <div className="form-group">
                <label>
                    Mnemonic Phrase
                    <textarea id="mnemonic-phrase" value={mnemonic} className="form-control" onChange={handleMnemonic} />
                </label>
            </div>
            <button type="button" className="btn btn-success mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-primary mx-2" onClick={props.onReturnCallback}>Back</button>
        </div>
    );
}

export default MnemonicWallet;