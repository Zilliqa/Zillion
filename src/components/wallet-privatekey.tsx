import React, { useState, useContext} from 'react';
import { AuthContext } from '../contexts/authContext';
import * as Account from '../account';

function WalletPrivatekey(props: any) {

    const authContext = useContext(AuthContext);
    const [privateKey, setPrivatekey] = useState('');
    const [error, setError] = useState('');

    const handleError = () => {
        setError('error');
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
            { error ? <p>There is something wrong in decrypting. Please ensure there is no additional spaces at the end.</p> : null }
            <div className="form-group row justify-content-center">
                <div className="col-md-4">
                    <input id="privatekey" type="password" name="password" className="form-control p-4" placeholder="Enter your private key" value={privateKey} onChange={handlePrivatekey}/>
                </div>
            </div>
            <button type="button" className="btn btn-user-action mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
        </div>
    );

}

export default WalletPrivatekey;