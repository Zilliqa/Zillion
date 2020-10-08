import React, { Component } from 'react';
import AppContext from '../contexts/appContext';
import Alert from './alert';
import * as Account from '../account';
import { AccessMethod } from '../util/enum';


class WalletKeystore extends Component<any, any> {

    static contextType = AppContext;

    constructor(props: any) {
        super(props);
        this.state = {
            filename: "",
            passphrase: "",
            keystore: "",
        }
    }

    componentDidMount() {
        // may need to load the account first?
    }

    handleFile = (e: any) => {
        let keystoreFile = e.target.files[0];
        this.setState({filename: keystoreFile.name});
        this.setState({keystore: keystoreFile});
    }

    handlePassword = (e: any) => {
        this.setState({passphrase: e.target.value})
    }

    handleError = () => {
        Alert('error', 'Keystore Decrypt Error', 'Please ensure your passphrase is correct.')
    }

    unlockWallet = () => {
        if (this.state.keystore !== "") {
            const reader = new FileReader();

            reader.readAsText(this.state.keystore);

            reader.onload = async () => {
                // have to try catch the add wallet error
                const keystoreJSON = reader.result as string;
                const address = await Account.addWalletByKeystore(keystoreJSON, this.state.passphrase);

                if (address !== "error") {
                    console.log("wallet add success: %o", address);
                    // show loading state
                    this.props.onWalletLoadingCallback();

                    // update context
                    this.context.initParams(address, AccessMethod.KEYSTORE);
                    await this.context.updateRole(address, this.props.role);
                    this.context.updateAuth();

                    // no error
                    // call parent function to redirect to dashboard
                    this.props.onSuccessCallback();
                } else {
                    this.handleError();
                }
            }

            reader.onerror = (e) => {
                console.error(e);
            }
        }
    }

    render() {
        return (
            <div className="wallet-access">
                <h2>Access wallet via Keystore</h2>
                <div>
                    <div id="keystore">
                        <p className="file-name">{this.state.filename}</p>
                        <label htmlFor="browsekeystore">{this.state.filename ? "Select wallet file" : "Select wallet file"}</label>
                        <input type="file" id="browsekeystore" onChange={this.handleFile} />
                    </div>
                    <input id="keystore-passphrase" type="password" name="password" className="p-2" placeholder="Enter your passphrase" value={this.state.passphrase} onChange={this.handlePassword}/>
                </div>
                <br/>
                <button type="button" className="btn btn-user-action mx-2" onClick={this.unlockWallet}>Unlock Wallet</button>
                <button type="button" className="btn btn-user-action-cancel mx-2" onClick={this.props.onReturnCallback}>Back</button>
            </div>
        );
    }
}

export default WalletKeystore;