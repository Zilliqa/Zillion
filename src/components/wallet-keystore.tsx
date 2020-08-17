import React, { Component } from 'react';
import { AuthContext } from '../contexts/authContext';
import * as StakezAccount from '../stakez-account';

// TODO
// error handling decrypt error

class WalletKeystore extends Component<any, any> {

    static contextType = AuthContext;

    constructor(props: any) {
        super(props);
        this.state = {
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
                const address = await StakezAccount.addWalletByKeystore(keystoreJSON, this.state.passphrase);

                if (address !== "error") {
                    console.log("wallet add success: %o", address);
                    this.context.toggleAuthentication(address);
                    // no error
                    // call parent function to redirect to dashboard
                    this.props.onSuccess();
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
                <h2>Load Wallet using Keystore</h2>
                { this.state.error ? <p>There is something wrong in decrypting</p> : null }
                <div>
                    <input type="file" onChange={this.handleFile} />
                </div>
                <div>
                    <input type="password" name="password" value={this.state.passphrase} onChange={this.handlePassword}/>
                </div>
                <button type="button" className="btn btn-success" onClick={this.unlockWallet}>Unlock Wallet</button>
                <button type="button" className="btn btn-primary" onClick={this.props.returnToMain}>Back</button>
            </div>
        );
    }
}

export default WalletKeystore;