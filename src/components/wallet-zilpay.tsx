import React, { useContext } from 'react';

import AppContext from '../contexts/appContext';
import { AccessMethod, Environment } from '../util/enum';
import Alert from './alert';


function WalletZilPay(props: any) {

    const appContext = useContext(AppContext);
    const { initParams, updateAuth, updateNetwork, updateRole } = appContext;

    const role = props.role;

    // config.js from public folder
    const { environment_config } = (window as { [key: string]: any })['config'];

    const unlockWallet = async () => {

        // Getting ZilPay inject.
        const zilPay = (window as any).zilPay;

        // Checking on ZilPay inject and wallet state.
        if (!zilPay) {
            Alert('warn', 'ZilPay Not Installed', 'Please install ZilPay wallet.');
            return null;

        } else if (!zilPay.wallet.isEnable) {
            Alert('warn', 'Locked Wallet', 'Please unlock wallet on ZilPay.');
            return null;
        }

        try {
            // Shell try ask user about access.
            const connected = zilPay.wallet.connect();

            // Checking access.
            if (!connected) {
                Alert('error', 'Locked Wallet', 'Please allow ZilPay to access this app.');
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
            Alert('error', 'Unable to access ZilPay', 'Please check if there is a new ZilPay version or clear your browser cache.');
        }
    }

    return (
        <>
        <div className="wallet-access">
            <h2>Access wallet using ZilPay</h2>
            
            { environment_config === Environment.PROD ? 
                <p className="my-4"><strong>Note:</strong> We remind all users to set your ZilPay network to <strong>Mainnet</strong></p> :
                <p className="my-4"><strong>Note:</strong> We remind all users to set your ZilPay network to <strong>Testnet</strong></p>
            }
            
            <button type="button" className="btn btn-user-action mx-2" onClick={unlockWallet}>Unlock Wallet</button>
            <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
        </div>
        </>
    );
}

export default WalletZilPay;