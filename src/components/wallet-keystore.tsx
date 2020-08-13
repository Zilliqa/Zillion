import React, { Component } from 'react';
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');

class WalletKeystore extends Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = {
            account: ""
        }
    }

    async componentDidMount() {
        const account = await zilliqa.wallet.addByKeystore('jsonfile', 'passphrase');
        this.setState({account: account})
    }

    handleChange(selectorFiles : FileList) {
        console.log(selectorFiles)
    }

    handleFile = (e: { target: { files: any; }; }) => {
        let keystoreFile = e.target.files[0];
        let reader = new FileReader();
        reader.readAsText(keystoreFile);
        reader.onload = () => {
            console.log(reader.result);
        }
    }

    render() {
        return (
            <div>
                <h2>Load Wallet using Keystore</h2>
                <p>{this.state.account}</p>
                {/* get json file */}
                <div>
                    <input type="file" onChange={this.handleFile} />
                </div>
                <button type="button" className="btn btn-primary" onClick={this.props.returnToMain}>Back</button>
            </div>
        );
    }
}

export default WalletKeystore;