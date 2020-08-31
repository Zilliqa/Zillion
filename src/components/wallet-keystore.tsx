import React, { Component } from 'react';
import { AuthContext } from '../contexts/authContext';
import * as Account from '../account';

// TODO
// error handling decrypt error

class WalletKeystore extends Component<any, any> {

    static contextType = AuthContext;

    constructor(props: any) {
        super(props);
        this.state = {
            filename: "",
            passphrase: "",
            keystore: "",
            error: ""
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
        this.setState({error: "error"});
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
                    this.context.toggleAuthentication(address);
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
            <div>
                <h2 className="mb-4">Access Wallet via Keystore</h2>
                { this.state.error ? <p>There is something wrong in decrypting</p> : null }
                <div>
                    <div id="keystore">
                        <p><strong>{this.state.filename}</strong></p>
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