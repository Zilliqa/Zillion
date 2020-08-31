import React, { useState, useContext} from 'react';
import { ToastContainer } from 'react-toastify';
import { AuthContext } from '../contexts/authContext';
import Alert from './alert';
import * as Account from '../account';

import 'react-toastify/dist/ReactToastify.css';

function WalletPrivatekey(props: any) {

    const authContext = useContext(AuthContext);
    const [privateKey, setPrivatekey] = useState('');

    const handleError = () => {
        Alert('error', 'There is something wrong in decrypting. Please ensure there are no additional spaces at the end.');
    }

    const handlePrivatekey = (e: any) => {
        setPrivatekey(e.target.value)
    }

    const unlockWallet = async () => {
        console.log("unlock by privatekey");
        if (privateKey !== "") {
            const address = await Account.addWalletByPrivatekey(privateKey);

            if (address !== "error") {
                console.log("wallet add success: %o", address);
                authContext.toggleAuthentication(address);
                props.onSuccessCallback();
            } else {
                handleError();
            }
        }
    }

    return (
        <div>
            <h2 className="mb-4">Access Wallet via Private Key</h2>
            <div className="form-group row justify-content-center">
                <div className="col-md-4">
                    <input id="privatekey" type="password" name="password" className="form-control p-4" placeholder="Enter your private key" value={privateKey} onChange={handlePrivatekey}/>
                </div>
            </div>
            <button type="button" className="btn btn-user-action mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
            <ToastContainer hideProgressBar={true} />
        </div>
    );

}

export default WalletPrivatekey;