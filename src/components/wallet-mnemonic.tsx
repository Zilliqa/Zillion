import React, { useState, useContext } from 'react';
import { ToastContainer } from 'react-toastify';
import { AuthContext } from '../contexts/authContext';
import Alert from './alert';
import * as Account from '../account';
import { AccessMethod } from '../util/enum';


function MnemonicWallet(props: any) {

    const authContext = useContext(AuthContext);
    const role = props.role;
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
            authContext.toggleAuthentication(address, AccessMethod.MNEMONIC, role);
            // no error
            // call parent function to redirect to dashboard
            props.onSuccessCallback();
        } else {
            handleError();
        }
    };

    return (
        <div className="wallet-access">
            <h2 className="mb-4">Access Wallet via Mnemonic Phrase</h2>
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