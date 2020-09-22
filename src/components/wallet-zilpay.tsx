import React, { useContext } from 'react';
import { ToastContainer } from 'react-toastify';

import AppContext from '../contexts/appContext';
import { AccessMethod } from '../util/enum';
import Alert from './alert';

import { isFirefox } from "react-device-detect";

function WalletZilPay(props: any) {

    const appContext = useContext(AppContext);
    const { initParams, updateAuth, updateNetwork, updateRole } = appContext;

    const role = props.role;

    const unlockWallet = async () => {
        if (isFirefox) {
            Alert('warn', 'Please use ZilPay on Chrome browsers.');
            return null;
        }

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
                Alert('error', 'Rejected access!');
                return null;
            }

            const { base16 } = zilPay.wallet.defaultAccount;

            // request parent to show spinner while updating context
            props.onWalletLoadingCallback();

            // update context
            // need await for update role for it to complete, otherwise context is empty
            // update with zilpay selected network
            initParams(base16, AccessMethod.ZILPAY);
            updateNetwork(zilPay.wallet.net);
            await updateRole(base16, role);
            updateAuth();

            // request parent to redirect to dashboard
            props.onSuccessCallback();
        } catch (err) {
            console.error("error unlocking via zilpay...: %o", err);
            Alert('error', 'There is something wrong with accessing ZilPay.')
        }

        // if no error
        // call parent function to redirect to dashboard
        props.onSuccessCallback();
    }

    return (
        <div className="wallet-access">
            <h2>Access wallet using ZilPay</h2>
            <p className="my-4"><strong>Note:</strong> We only support ZilPay extension on Chrome browsers currently and remember to set your ZilPay network to <strong>Testnet</strong></p>
            <button type="button" className="btn btn-user-action mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
            <ToastContainer hideProgressBar={true} />
        </div>
    );
}

export default WalletZilPay;