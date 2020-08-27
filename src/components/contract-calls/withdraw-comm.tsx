import React, { useState } from 'react';
import { OperationStatus } from "../../util/enum";
import * as Account from "../../account";

function WithdrawCommModal(props: any) {
    const { proxy, currentRewards } = props;
    const [txnId, setTxnId] = useState('')
    const [error, setError] = useState('');

    const handleClose = () => {
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        setTimeout(() => {
            setTxnId('');
            setError('');
        }, 150);
    }

    const withdrawComm = async () => {
        const result = await Account.withdrawComm(proxy);
        console.log(result);
        if (result === OperationStatus.ERROR) {
            setError(OperationStatus.ERROR);
        } else {
            const resultJson = JSON.parse(result);
            setTxnId(resultJson.txn_id);
        }
    }

    return (
        <div id="withdraw-comm-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="withdrawCommModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="withdrawCommModalLabel">Withdraw Commission</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        { error ? ( <p>There is an error.</p> ) : null}
                        
                        { txnId ?
                            (
                                <>
                                <p>Transaction Sent: {txnId}</p>
                                <p>Please check the status on Devex</p>
                                </>
                            ) :
                            <>
                            <p>Current Commission Reward: {currentRewards ? currentRewards : '0'} ZIL</p>
                            <p>Are you sure you want to withdraw the commission rewards?</p>
                            <button type="button" className="btn btn-success mr-2" onClick={withdrawComm}>Withdraw</button>
                            <button type="button" className="btn btn-danger mx-2" data-dismiss="modal" onClick={handleClose}>Cancel</button>
                            </>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WithdrawCommModal;