import React, { useContext} from 'react';
import { ToastContainer } from 'react-toastify';

import AppContext from '../contexts/appContext';
import { AccessMethod } from '../util/enum';
import Alert from './alert';

function WalletZilPay(props: any) {

    const appContext = useContext(AppContext);
    const { initParams, updateAuth, updateRole } = appContext;

    const role = props.role;

    const unlockWallet = async () => {
        console.log("unlock by zilpay");

        try {
            // import zilpay object
            // use zilpay to connect

            // if now issues
            // request parent to show loading state
            props.onWalletLoadingCallback();

            // update context
            initParams("wallet_address", role, AccessMethod.ZILPAY);
            await updateRole("wallet_address", role);
            updateAuth()

            // request parent to redirect to dashboard
            props.onSuccessCallback();
        } catch (err) {
            console.error("error unlocking via zilpay...: %o", err);
            Alert('info', 'There is something wrong with accessing ZilPay.')
        }

        // if no error
        // call parent function to redirect to dashboard
        props.onSuccessCallback();
    }

    return (
        <div>
            <h2>Access Wallet using ZilPay</h2>
            <button type="button" className="btn btn-success mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-primary mx-2" onClick={props.onReturnCallback}>Back</button>
            <ToastContainer hideProgressBar={true} />
        </div>
    );
}

export default WalletZilPay;