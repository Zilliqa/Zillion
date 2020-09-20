import React, { useState, useContext} from 'react';
import { ToastContainer } from 'react-toastify';
import AppContext from '../contexts/appContext';
import Alert from './alert';
import * as Account from '../account';
import { AccessMethod } from '../util/enum';


function WalletPrivatekey(props: any) {

    const appContext = useContext(AppContext);
    const { initParams, updateAuth, updateRole } = appContext;
    
    const role = props.role;
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
            const walletAddress = await Account.addWalletByPrivatekey(privateKey);

            if (walletAddress !== "error") {
                console.log("wallet add success: %o", walletAddress);
                // show loading state
                props.onWalletLoadingCallback();

                // update context
                initParams(walletAddress, AccessMethod.PRIVATEKEY);
                await updateRole(walletAddress, role);
                updateAuth();

                // redirect to dashboard
                props.onSuccessCallback();
            } else {
                handleError();
            }
        }
    }

    return (
        <div className="wallet-access">
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