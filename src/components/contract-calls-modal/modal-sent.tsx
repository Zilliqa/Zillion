import React from 'react';
import IconCheckboxCircle from '../icons/checkbox-circle';

const ModalSent = (props: any) => {
    return (
        <div className="modal-body text-center">
            <IconCheckboxCircle className="modal-icon-success" width="80" height="80" />
            <p className="mt-2"><strong>Transaction Sent</strong><br/><span className="txn-id">{props.txnId}</span></p>
            <button type="button" className="btn btn-user-action mx-2" data-dismiss="modal" onClick={props.handleClose}>Done</button>
        </div>
    );
};

export default ModalSent;