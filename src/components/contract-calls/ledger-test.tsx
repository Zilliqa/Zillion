import React, { useState, useContext } from 'react';

import TransportU2F from "@ledgerhq/hw-transport-u2f";
import TransportWebAuthn from "@ledgerhq/hw-transport-webauthn";

import ZilliqaLedger from '../../ledger';
import * as ZilliqaAccount from '../../account';
import { AccessMethod } from '../../util/enum';

import { fromBech32Address } from '@zilliqa-js/crypto';
const { BN, Long, units, validation, bytes } = require('@zilliqa-js/util');

function LedgerCallModal(props: any) {

    const handleClose = () => {
        console.log("close ledger modal");
    }

    const test = async () => {
        // let transport = null;
        // const isWebAuthn = await TransportWebAuthn.isSupported();
        // if (isWebAuthn) {
        //     console.log("webauthn is supported");
        //     transport = await TransportWebAuthn.create();
        // } else {
        //     transport = await TransportU2F.create();
        // }

        // const ledger = new ZilliqaLedger(transport);
        // const result = await ledger.getPublicAddress(0);
        // // get public key
        // let pubKey = result.pubKey;

        // // get recipient base16 address
        // let recipient = result.pubAddr;
        // if (validation.isBech32(recipient)) {
        //     recipient = fromBech32Address(recipient);
        // }

        // console.log("pubKey: %o", pubKey);
        // console.log("pubAddr: %o", recipient);

        // // get nonce
        // let nonce = await ZilliqaAccount.getNonce(recipient);

        // let txParams = {
        //     version: bytes.pack(333, 1),
        //     nonce: nonce,
        //     pubKey: pubKey,
        //     amount: new BN(1000000000000),
        //     gasPrice: new BN(units.toQa('1000', units.Units.Li)),
        //     gasLimit: Long.fromNumber(30000),
        //     toAddr: recipient,
        //     data: '',
        //     code: ''
        // };

        // try {
        //     const signature = await ledger.signTxn(0, txParams);
        //     const signedTx = {
        //         ...txParams,
        //         amount: txParams.amount.toString(),
        //         gasPrice: txParams.gasPrice.toString(),
        //         gasLimit: txParams.gasLimit.toString(),
        //         signature
        //     };
        //     console.log(signedTx);

        //     // send the signed transaction
        //     try {
        //         const newTx = {
        //             id: "1",
        //             jsonrpc: "2.0",
        //             method: "CreateTransaction",
        //             params: [
        //                 {
        //                     toAddr: recipient,
        //                     amount: txParams.amount.toString(),
        //                     code: '',
        //                     data: '',
        //                     gasPrice: txParams.gasPrice.toString(),
        //                     gasLimit: txParams.gasLimit.toString(),
        //                     nonce: nonce,
        //                     pubKey: pubKey,
        //                     signature: signature,
        //                     version: bytes.pack(333, 1),
        //                     priority: true
        //                 }
        //             ]
        //         };

        //         const response = await fetch("https://dev-api.zilliqa.com", {
        //             method: "POST",
        //             mode: "cors",
        //             cache: "no-cache",
        //             credentials: "same-origin",
        //             headers: {
        //                 "Content-Type": "application/json"
        //             },
        //             body: JSON.stringify(newTx)
        //         });

        //         let data = await response.json();
        //         if (data.result.TranID !== undefined) {
        //             console.log("ledger sent txn! - txnid: %o", data.result.TranID);
        //         }

        //         if (data.error !== undefined) {
        //             console.error(data.error);
        //         }

        //         if (data.result.error !== undefined) {
        //             console.error(data.result.error);
        //         }

        //         transport.close();

        //     } catch (err) {
        //         console.log("something is wrong with broadcasting the transaction :%o", JSON.stringify(err));
        //     }

        // } catch (err) {
        //     console.error("error - ledger signing: %o", err);
        // }
        let txParams = {
            amount: new BN(1000000000000),
            gasPrice: new BN(units.toQa('1000', units.Units.Li)),
            gasLimit: Long.fromNumber(30000),
            data: '',
            code: ''
        };
        const txnId = await ZilliqaAccount.handleSign(AccessMethod.LEDGER, 'https://dev-api.zilliqa.com/', txParams);
        console.log(txnId);
    }

    return (
        <div id="ledger-call-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="ledgerCallModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5>Ledger Call</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        <button type="button" className="btn btn-user-action mr-2" onClick={test}>test</button>
                        <button type="button" className="btn btn-user-action-cancel mx-2" data-dismiss="modal" onClick={handleClose}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LedgerCallModal;