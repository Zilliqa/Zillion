import React from 'react';
import { AccountType } from '../util/enum';
import Alert from './alert';
import { toBech32Address } from '@zilliqa-js/crypto';

import 'zeeves-auth-sdk-js';

const zeeves = (window as any).Zeeves;

if (zeeves) {
  //allow console logging
  zeeves.properties.isDebug = true;
}

function WalletZeeves(props: any) {
    const unlockWallet = async () => {
        if (!zeeves) {
            Alert('warn', 'Zeeves is not loaded', 'Please try another option to sign-in.');
            return null;
        }

        try {
            // authenticating with Zeeves
            await zeeves.auth();

            const { base16 } = zeeves.wallet.defaultAccount;
            const bech32Address = toBech32Address(base16);

            // request parent to show spinner while updating
            props.onWalletLoadingCallback();
            
            // request parent to redirect to dashboard
            props.onSuccessCallback(base16, bech32Address, AccountType.ZEEVES);
        } catch (err) {
            console.error("Error connecting Zeeves: %o", err && err.stack ? err.stack : JSON.stringify(err));
            Alert('error', 'Error connecting Zeeves', 'Please reload page and try again. Might be also helpful to clear browser cache.');
        }
    }

    return (
        <>
            <div className="wallet-access">
                <h2>Access wallet using Zeeves</h2>
                
                <button type="button" className="btn btn-user-action mx-2" onClick={unlockWallet}>Connect Wallet</button>
                <button type="button" className="btn btn-user-action-cancel mx-2" onClick={props.onReturnCallback}>Back</button>
            </div>
        </>
    );
}

export default WalletZeeves;