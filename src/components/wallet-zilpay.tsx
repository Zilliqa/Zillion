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
        // Getting ZilPay inject.
        const zilPay = (window as any).zilPay;

        // Checking on ZilPay inject and wallet state.
        if (!zilPay) {
            Alert('warn', 'Please install ZilPay wallet.');

            return null;
        } else if (!zilPay.wallet.isEnable) {
            Alert('warn', 'Please unlock wallet.');

            return null;
        }

        try {
            // Shell try ask user about access.
            const connected = await zilPay.wallet.connect();

            // Checking access.
            if (!connected) {
                Alert('warn', 'Rejected access!');

                return null;
            }

            const { base16 } = zilPay.wallet.defaultAccount;
            const accountStreamChanged = zilPay.wallet.observableAccount();

            // request parent to show spinner while updating context
            props.onWalletLoadingCallback();

            // update context
            initParams(base16, role, AccessMethod.ZILPAY);
            updateRole(base16, role);
            updateAuth();

            /**
             * Stream event by account change.
             * @param account - Is `zilPay.wallet.defaultAccount` object.
             */
            accountStreamChanged.subscribe((account: any) => {
                initParams(account.base16, role, AccessMethod.ZILPAY);
                updateRole(account.base16, role);
                updateAuth();
            });

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