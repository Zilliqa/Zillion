import React, { useState } from 'react';
import { OperationStatus } from "../util/enum";
import * as Account from "../account";

function WithdrawCommModal(props: any) {
    const { proxy } = props;
    const [txnId, setTxnId] = useState('')
    const [error, setError] = useState('');

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
                            <p>Are you sure you want to withdraw commission rewards?</p>
                            <button type="button" className="btn btn-primary mx-2" onClick={withdrawComm}>Withdraw</button>
                            <button type="button" className="btn btn-danger mx-2" data-dismiss="modal">Cancel</button>
                            </>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WithdrawCommModal;