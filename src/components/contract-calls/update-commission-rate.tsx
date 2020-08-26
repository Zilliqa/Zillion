import React, { useState } from 'react';
import { OperationStatus } from "../../util/enum";
import * as Account from "../../account";

function UpdateCommRateModal(props: any) {
    const { proxy, currentRate } = props;
    const [newRate, setNewRate] = useState('');
    const [txnId, setTxnId] = useState('')
    const [error, setError] = useState('');

    const updateCommRate = async () => {
        const result = await Account.updateCommissionRate(proxy, newRate);
        console.log(result);
        if (result === OperationStatus.ERROR) {
            setError(OperationStatus.ERROR);
        } else {
            const resultJson = JSON.parse(result);
            setTxnId(resultJson.txn_id);
        }
    }

    return (
        <div id="update-comm-rate-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="updateCommRateModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="updateCommRateModalLabel">Update Commission Rate</h5>
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
                            <p>Current Commission Rate: {currentRate ? currentRate : '0'} &#37;</p>
                            <input type="text" className="form-control mb-4" value={newRate} onChange={(e:any) => setNewRate(e.target.value)} placeholder="Enter new rate in %" />
                            <button type="button" className="btn btn-success mr-2" onClick={updateCommRate}>Update</button>
                            <button type="button" className="btn btn-danger mx-2" data-dismiss="modal">Cancel</button>
                            </>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UpdateCommRateModal;