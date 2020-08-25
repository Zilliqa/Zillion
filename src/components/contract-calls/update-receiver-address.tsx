import React, { useState } from 'react';
import { OperationStatus } from "../../util/enum";
import * as Account from "../../account";

function UpdateReceiverAddress(props: any) {
    const { proxy } = props;
    const [newAddress, setNewAddress] = useState('');
    const [txnId, setTxnId] = useState('');
    const [error, setError] = useState('');

    const updateAddress = async () => {
        const result = await Account.updateReceiverAddress(proxy, newAddress);
        console.log(result);
        if (result === OperationStatus.ERROR) {
            setError(OperationStatus.ERROR);
        } else {
            const resultJson = JSON.parse(result);
            setTxnId(resultJson.txn_id);
        }
    }

    return (
        <div id="update-recv-addr-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="updateRecvAddrModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="updateRecvAddrModalLabel">Update Received Address</h5>
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
                            <input type="text" className="form-control mb-4" value={newAddress} onChange={(e:any) => setNewAddress(e.target.value)} placeholder="Enter new address in ByStr20" />
                            <button type="button" className="btn btn-success mr-2" onClick={updateAddress}>Update</button>
                            <button type="button" className="btn btn-danger mx-2" data-dismiss="modal">Cancel</button>
                            </>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UpdateReceiverAddress;