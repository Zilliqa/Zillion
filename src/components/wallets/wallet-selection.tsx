import { toBech32Address } from "@zilliqa-js/crypto";
import React, { useState } from "react";
import { AccountType, OperationStatus } from "../../util/enum";
import Alert from "../alert";
import IconKeystoreLine from "../icons/keystore-line";
import IconLedgerLine from "../icons/ledger-line";
import IconZilPayLine from "../icons/zil-pay-line";

import $ from "jquery";


function WalletSelectionModal(props: any) {

    // selected account
    // wallet loading status
    const [account, setAccount] = useState<String>(AccountType.NONE.toString());
    const [status, setStatus] = useState(OperationStatus.IDLE);

    const pulseIcon = (_account: AccountType, _status: OperationStatus) => {
        if (account === _account && status === OperationStatus.PENDING) {
            return (
                <div className="mt-1 ml-auto spinner-grow-primary"><i className="spinner-grow spinner-grow-sm"></i></div>
            );
        }
        return null;
    }

    const reset = () => {
        setAccount(AccountType.NONE);
        setStatus(OperationStatus.IDLE);
    }

    const unlockZilPay = async () => {
        // get zilpay inject
        const zilPay = (window as any).zilPay;

        // checking zilpay inject and wallet state
        if (!zilPay) {
            Alert('warn', 'ZilPay Not Installed', 'Please install ZilPay wallet.');
            return false;
        } else if (!zilPay.wallet.isEnable) {
            Alert('warn', 'Locked Wallet', 'Please unlock wallet on ZilPay.');
            return false;
        }

        try {
            // request user to click the zilpay prompt
            const connected = await zilPay.wallet.connect();

            if (!connected) {
                Alert('error', 'Locked Wallet', 'Please allow ZilPay to access this app.');
                return false;
            }

            const { base16 } = zilPay.wallet.defaultAccount;
            const bech32Address = toBech32Address(base16);

            // invoke redux saga to save user info
            props.onUpdateUserInfo(base16, bech32Address, AccountType.ZILPAY);

            // request parent to redirect to dashboard
            props.goToDashboard();

            return true;
        } catch (err) {
            console.error("error unlocking via zilpay...: %o", err);
            Alert('error', 'Unable to access ZilPay', 'Please check if there is a new ZilPay version or clear your browser cache.');
            return false;
        }
    }

    const toggleModal = (visible = 'show', modal = '') => {
        if (visible === 'show') {
            $(`#${modal}`).modal('show');
        } else {
            $(`#${modal}`).modal('hide');
        }
    }
    
    const onSelectWallet = async (accountType: AccountType) => {

        setAccount(accountType);
        setStatus(OperationStatus.PENDING);
        props.toggleWalletSelection(accountType);

        let isSuccess = false;

        switch (accountType) {
            case AccountType.ZILPAY:
                isSuccess = await unlockZilPay();
                break;
            case AccountType.LEDGER:
                toggleModal('hide', 'wallet-selection-modal');
                toggleModal('show', 'wallet-ledger-modal');
                break;
            case AccountType.KEYSTORE:
                toggleModal('hide', 'wallet-selection-modal');
                toggleModal('show', 'wallet-keystore-modal');
                break;
            default:
                break;
        }

        if (isSuccess === false) {
            reset();
        }
    }

    return (
        <div 
            id="wallet-selection-modal" 
            className="modal fade" 
            tabIndex={-1} 
            role="dialog"
            aria-labelledby="walletSelectionModalLabel"
            aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="walletSelectionModalLabel">Connect Wallet</h5>
                            <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <button 
                                type="button"
                                className="btn btn-wallet-access btn-block d-flex align-items-center mb-4"
                                onClick={async () => onSelectWallet(AccountType.ZILPAY)}
                                disabled={account && account !== AccountType.ZILPAY}
                            >
                                <IconZilPayLine className="home-icon icon-zilpay-line" /><span className="mt-1 ml-4">ZilPay</span>
                                { pulseIcon(AccountType.ZILPAY, status) }
                            </button>
                            <button 
                                type="button"
                                className="btn btn-wallet-access btn-block d-flex align-items-center mb-4"
                                onClick={async () => onSelectWallet(AccountType.LEDGER)}
                                disabled={account && account !== AccountType.LEDGER}
                            >
                                <IconLedgerLine className="home-icon icon-ledger-line" /><span className="mt-1 ml-4">Ledger</span>
                                { pulseIcon(AccountType.LEDGER, status) }
                            </button>
                            <button 
                                type="button"
                                className="btn btn-wallet-access btn-block d-flex align-items-center mb-4"
                                onClick={async () => onSelectWallet(AccountType.KEYSTORE)}
                                disabled={account && account !== AccountType.KEYSTORE}
                            >
                                <IconKeystoreLine className="home-icon" /><span className="mt-1 ml-4">Keystore</span>
                                { pulseIcon(AccountType.KEYSTORE, status) }
                            </button>
                        </div>
                    </div>
                </div>
        </div>
    )
}

export default WalletSelectionModal;