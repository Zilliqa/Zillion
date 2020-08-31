import React, { useState, useContext } from 'react';
import { ToastContainer } from 'react-toastify';
import { AuthContext } from '../contexts/authContext';
import Alert from './alert';
import * as Account from '../account';

import 'react-toastify/dist/ReactToastify.css';

function MnemonicWallet(props: any) {

    const authContext = useContext(AuthContext);
    const [mnemonic, setMnemonic] = useState('');

    const handleError = () => {
        Alert('error', 'There is something wrong in decrypting. Please ensure there are no carriage returns.');
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
            <h2 className="mb-4">Access Wallet via Mnemonic Phrase</h2>
            <p className="lead">Simple implementation without password</p>
            <div className="form-group">
                <label>
                    <strong>Mnemonic Phrase</strong>
                    <textarea id="mnemonic-phrase" value={mnemonic} className="form-control" onChange={handleMnemonic} />
                </label>
            </div>
            <button type="button" className="btn btn-user-action mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
            <ToastContainer hideProgressBar={true} />
        </div>
    );
}

export default MnemonicWallet;