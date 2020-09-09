import React from 'react';
import IconCheckboxCircle from '../icons/checkbox-circle';

const ModalSent = (props: any) => {
    return (
        <div className="modal-body modal-sent text-center">
            <IconCheckboxCircle className="modal-icon-success" width="80" height="80" />
            <h2 className="mt-2">Transaction Sent</h2>
            <p className="txn-id">{props.txnId}</p>
            <button type="button" className="btn btn-user-action mx-2" data-dismiss="modal" onClick={props.handleClose}>Done</button>
        </div>
    );
};

export default ModalSent;