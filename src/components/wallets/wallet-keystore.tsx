import { toBech32Address } from "@zilliqa-js/crypto";
import React, { useEffect, useState } from "react";
import { AccountType, OperationStatus } from "../../util/enum";
import { logger } from "../../util/logger";
import { ZilSigner } from "../../zilliqa-signer";
import Alert from "../alert";


function WalletKeystoreModal(props: any) {
    const [filename, setFilename] = useState("");
    const [passphrase, setPassphrase] = useState("");
    const [keystore, setKeystore] = useState();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setFilename("");
        setPassphrase("");
        setKeystore(undefined);
        setLoading(false);
    }, [props.isToggleWalletSelection]);

    const handleClose = () => {
        setFilename("");
        setPassphrase("");
        setKeystore(undefined);
        setLoading(false);
    }

    const handleFile = (e: any) => {
        let keystoreFile = e.target.files[0];
        if (!keystoreFile) {
            return;
        }
        setFilename(keystoreFile.name);
        setKeystore(keystoreFile);
    }

    const handlePassword = (e: any) => {
        setPassphrase(e.target.value);
    }

    const unlockWallet = () => {
        if (keystore === undefined || keystore === null || keystore === "") {
            Alert('error', 'Keystore not found', 'Please upload a keystore file.');
            return;
        }

        const reader = new FileReader();
        reader.readAsText(keystore!);

        setLoading(true);

        reader.onload = async () => {
            const keystoreJSON = reader.result as string;
            const address = await ZilSigner.addWalletByKeystore(keystoreJSON, passphrase); // base16 with 0x

            if (address !== OperationStatus.ERROR) {
                logger("wallet add success: ", address);

                const bech32Address = toBech32Address(address);

                // invoke redux saga to save user info
                props.onUpdateUserInfo(address.toLowerCase(), bech32Address, AccountType.KEYSTORE);

                // request parent to redirect to dashboard
                props.goToDashboard();

            } else {
                Alert('error', 'Keystore Decrypt Error', 'Please ensure your passphrase is correct.');
                setLoading(false);
            }
        }
        
        reader.onerror = (e) => {
            console.error(e);
            setLoading(false);
        }
    }

    return (
        <div
            id="wallet-keystore-modal"
            className="modal fade"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="walletKeystoreModalLabel"
            aria-hidden="true"
            data-keyboard={ loading ? "false" : "true" }
            data-backdrop={ loading ? "static" : "true" }>
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="walletKeystoreModalLabel">Keystore Connect</h5>
                            {
                                loading 
                                
                                ? 

                                null 
                                
                                :

                                <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            }
                        </div>
                        <div className="modal-body">
                            {
                                loading 
                                
                                ?
                                
                                <div className="wallet-access text-center">
                                    <h2>Retrieving keystore wallet info...</h2>
                                    <div className="spinner-border dashboard-spinner" role="status">
                                    <span className="sr-only">Loading...</span>
                                    </div>
                                </div>

                                :
                                <>
                                <div id="keystore">
                                    <div className="file-name text-center">{filename}</div>
                                    <label className="text-center" htmlFor="browsekeystore">{filename ? "Select wallet file" : "Select wallet file"}</label>
                                    <input type="file" id="browsekeystore" onChange={handleFile} />
                                </div>
                                <input id="keystore-passphrase" type="password" name="password" className="p-2" placeholder="Enter your passphrase" value={passphrase} onChange={handlePassword}/>
                                <div className="text-center">
                                    <button 
                                        type="button" 
                                        className="btn btn-user-action mt-4" 
                                        onClick={unlockWallet}>
                                            Unlock Wallet
                                    </button>
                                </div>
                                </>
                            }
                        </div>
                    </div>
                </div>
        </div>
    )
}

export default WalletKeystoreModal;