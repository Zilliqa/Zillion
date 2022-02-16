import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { getTxnLink } from '../../util/utils';
import IconCheckboxCircle from '../icons/checkbox-circle';

function ModalContent(props: any) {

    const {
        progress = '',
        txnId = '',
        onCloseModal = null
    } = props;

    const networkURL = useAppSelector(state => state.blockchain.blockchain);

    return (
        <div className="modal-content">
            {
                progress === 'tx-pending' &&
                <div className="modal-body modal-processing text-center">
                    <h2>Processing...</h2>
                    <p className="mt-4">Please wait 1 - 2 minutes while we process the request.</p>
                    <div className='spinner-border dashboard-spinner' role="status">
                        <span className="sr-only">Loading...</span>
                    </div>
                </div>
            }

            {
                progress === 'tx-sent' && 
                <div className="modal-body modal-sent text-center">
                    <IconCheckboxCircle className="modal-icon-success" width="80" height="80" />
                    <h2 className="mt-2">Transaction Sent</h2>
                    <div className="txn-id">
                        <a href={getTxnLink(txnId, networkURL)} target="_blank" rel="noopener noreferrer">{txnId}</a>
                    </div>
                    <button type="button" className="btn btn-user-action mt-2 mx-2" data-dismiss="modal" onClick={onCloseModal}>Done</button>
                </div>
            }
        </div>
    );
}

export default ModalContent;