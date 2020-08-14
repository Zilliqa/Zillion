import React, { Component } from 'react';
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');

// TODO
// error handling decrypt error

class WalletKeystore extends Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = {
            account: "",
            passphrase: "",
            keystore: ""
        }
    }

    async componentDidMount() {
        // const account = await zilliqa.wallet.addByKeystore('jsonfile', 'passphrase');
        // this.setState({account: account})
    }

    handleFile = (e: any) => {
        let keystoreFile = e.target.files[0];
        this.setState({keystore: keystoreFile});
    }

    handlePassword = (e: any) => {
        this.setState({passphrase: e.target.value})
    }

    unlockWallet = () => {
        if (this.state.keystore !== "") {
            const reader = new FileReader();

            reader.readAsText(this.state.keystore);

            reader.onload = async () => {
                // have to try catch the add wallet error
                const keystoreJSON = reader.result;
                const account = await zilliqa.wallet.addByKeystore(keystoreJSON, this.state.passphrase);
                console.log(keystoreJSON);
                console.log(account);

                // no error call parent function to redirect to staking manager app
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