import React from 'react';
import { NetworkURL } from '../../util/enum';
import IconCheckboxCircle from '../icons/checkbox-circle';

const ModalSent = (props: any) => {

    const getExplorerLink = () => {
        let link = "";
        switch (props.networkURL) {
            case NetworkURL.MAINNET:
                link = "https://viewblock.io/zilliqa/tx/0x" + props.txnId
                break;
            default:
                // default to testnet
                link = "https://viewblock.io/zilliqa/tx/0x" + props.txnId  + "?network=testnet"
                break;
        }
        return link;
    }

    return (
        <div className="modal-body modal-sent text-center">
            <IconCheckboxCircle className="modal-icon-success" width="80" height="80" />
            <h2 className="mt-2">Transaction Sent</h2>
            <a href={getExplorerLink()} className="txn-id">{props.txnId}</a>
            <button type="button" className="btn btn-user-action mt-2 mx-2" data-dismiss="modal" onClick={props.handleClose}>Done</button>
        </div>
    );
};

export default ModalSent;