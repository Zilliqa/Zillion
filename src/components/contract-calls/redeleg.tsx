import React, { useState, useContext, useMemo } from 'react';
import { useTable, useSortBy } from 'react-table';
import ReactTooltip from 'react-tooltip';
import { toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import * as ZilliqaAccount from '../../account';
import AppContext from '../../contexts/appContext';
import ModalPending from '../contract-calls-modal/modal-pending';
import ModalSent from '../contract-calls-modal/modal-sent';
import Alert from '../alert';
import { bech32ToChecksum, convertZilToQa, convertQaToCommaStr, convertToProperCommRate, getTruncatedAddress, showWalletsPrompt } from '../../util/utils';
import { ProxyCalls, OperationStatus, TransactionType } from '../../util/enum';
import { computeDelegRewards } from '../../util/reward-calculator';

import { fromBech32Address } from '@zilliqa-js/crypto';


const { BN, units } = require('@zilliqa-js/util');


// hide the data that contains the sender address
// no point to transfer to same person
function Table({ columns, data, tableId, senderAddress, handleNodeSelect }: any) {
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = useTable(
        {
            columns, 
            data,
            initialState : {
                sortBy: [
                    {
                        id: "delegNum",
                        desc: true
                    },
                    {
                        id: "stakeAmt",
                        desc: true
                    }
                ]
            }
        }, useSortBy);

    return (
        <table id={tableId} className="table table-responsive-md" {...getTableProps()}>
            <thead>
                {headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            <th scope="col" {...column.getHeaderProps()}>{column.render('Header')}</th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody {...getTableBodyProps()}>
                {rows.map((row, i) => {
                    prepareRow(row)
                    return (
                        <>
                        {
                            (row.original as any).address !== senderAddress &&
                            <tr {...row.getRowProps()} onClick={() => handleNodeSelect(row.original)}>
                                {row.cells.map(cell => {
                                    return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                                })}
                            </tr>
                        }
                        </>
                    )
                })}
            </tbody>
        </table>
    );
}


function ReDelegateStakeModal(props: any) {
    const appContext = useContext(AppContext);
    const { accountType } = appContext;
    
    const { 
        proxy,
        impl,
        ledgerIndex,
        networkURL,
        minDelegStake,
        nodeSelectorOptions, 
        transferStakeModalData,
        updateData,
        updateRecentTransactions } = props;

    const minDelegStakeDisplay = units.fromQa(new BN(minDelegStake), units.Units.Zil);
    const userBase16Address = props.userAddress? fromBech32Address(props.userAddress).toLowerCase() : '';

    const fromSsn = transferStakeModalData.ssnAddress; // bech32
    const [toSsn, setToSsn] = useState('');
    const [toSsnName, setToSsnName] = useState('');
    const [delegAmt, setDelegAmt] = useState(''); // in ZIL

    const [txnId, setTxnId] = useState('');
    const [isPending, setIsPending] = useState('');
    const [showNodeSelector, setShowNodeSelector] = useState(false);

    
    // checks if there are any unwithdrawn rewards or buffered deposit
    const hasRewardToWithdraw = async () => {
        const ssnChecksumAddress = bech32ToChecksum(fromSsn).toLowerCase();
        
        const contract = await ZilliqaAccount.getSsnImplContractDirect(impl);

        if (contract === undefined || contract === 'error') {
            return false;
        }

        // compute rewards
        const delegRewards = new BN(await computeDelegRewards(impl, networkURL, ssnChecksumAddress, userBase16Address)).toString();

        if (delegRewards !== "0") {
            Alert('info', "Unwithdraw Rewards Found", "Please withdraw the rewards before transferring.");
            return true;
        }

        // secondary buffered deposits check
        // different map
        // check if user has buffered deposits
        if (contract.last_buf_deposit_cycle_deleg.hasOwnProperty(userBase16Address) &&
            contract.last_buf_deposit_cycle_deleg[userBase16Address].hasOwnProperty(ssnChecksumAddress)) {
                const lastDepositCycleDeleg = parseInt(contract.last_buf_deposit_cycle_deleg[userBase16Address][ssnChecksumAddress]);
                const lastRewardCycle = parseInt(contract.lastrewardcycle);
                if (lastRewardCycle <= lastDepositCycleDeleg) {
                    Alert('info', "Buffered Deposits Found", "Please wait for the next cycle before transferring.");
                    return true;
                }
        }

       // corner case check
        // if user has buffered deposits
        // happens if user first time deposit
        // reward is zero but contract side warn has unwithdrawn rewards
        // user cannot withdraw zero rewards from UI
        if (contract.buff_deposit_deleg.hasOwnProperty(userBase16Address) &&
            contract.buff_deposit_deleg[userBase16Address].hasOwnProperty(ssnChecksumAddress)) {
                const buffDepositMap: any = contract.buff_deposit_deleg[userBase16Address][ssnChecksumAddress];
                const lastCycleDelegNum = Object.keys(buffDepositMap).sort().pop() || '0';
                const lastRewardCycle = parseInt(contract.lastrewardcycle);

                if (lastRewardCycle < parseInt(lastCycleDelegNum + 2)) {
                    // deposit still in buffer 
                    // have to wait for 2 cycles to receive rewards to clear buffer
                    Alert('info', "Buffered Deposits Found", "Please wait for 2 more cycles for your rewards to be issued before transferring.");
                    return true;
                }
        }

        return false;
    }

    const redeleg = async () => {
        let delegAmtQa;

        if (!fromSsn || !toSsn) {
            Alert('error', "Invalid Node", "Please select a node.");
            return null;
        }

        if (!delegAmt) {
            Alert('error', "Invalid Transfer Amount", "Transfer amount cannot be empty.");
            return null;
        } else {
            try {
                delegAmtQa = convertZilToQa(delegAmt);
            } catch (err) {
                // user input is malformed
                // cannot convert input zil amount to qa
                Alert('error', "Invalid Transfer Amount", "Please check your transfer amount again.");
                return null;
            }
        }

        setIsPending(OperationStatus.PENDING);

        // check if deleg has unwithdrawn rewards or buffered deposits for the from ssn address
        const hasRewards = await hasRewardToWithdraw();
        if (hasRewards) {
            setIsPending('');
            return null;
        }

        // create tx params

        // toAddr: proxy address

        const proxyChecksum = bech32ToChecksum(proxy);
        const fromSsnChecksumAddress = bech32ToChecksum(fromSsn).toLowerCase();
        const toSsnChecksumAddress = bech32ToChecksum(toSsn).toLowerCase();
        const currentAmtQa = transferStakeModalData.delegAmt;
        const leftOverQa = new BN(currentAmtQa).sub(new BN(delegAmtQa));

        // check if redeleg more than current deleg amount
        if (new BN(delegAmtQa).gt(new BN(currentAmtQa))) {
            Alert('info', "Invalid Transfer Amount", "You only have " + convertQaToCommaStr(currentAmtQa) + " ZIL to transfer." );
            setIsPending('');
            return null;
        } else if (!leftOverQa.isZero() && leftOverQa.lt(new BN(minDelegStake))) {
            // check leftover amount
            // if less than min stake amount
            Alert('info', "Invalid Transfer Amount", "Please leave at least " +  minDelegStakeDisplay + " ZIL (min. stake amount) or transfer ALL.");
            setIsPending('');
            return null;
        }

        // gas price, gas limit declared in account.ts
        let txParams = {
            toAddr: proxyChecksum,
            amount: new BN(0),
            code: "",
            data: JSON.stringify({
                _tag: ProxyCalls.REDELEGATE_STAKE,
                params: [
                    {
                        vname: 'ssnaddr',
                        type: 'ByStr20',
                        value: `${fromSsnChecksumAddress}`,
                    },
                    {
                        vname: 'to_ssn',
                        type: 'ByStr20',
                        value: `${toSsnChecksumAddress}`,
                    },
                    {
                        vname: 'amount',
                        type: 'Uint128',
                        value: `${delegAmtQa}`,
                    }
                ]
            })
        };

        showWalletsPrompt(accountType);

        trackPromise(ZilliqaAccount.handleSign(accountType, networkURL, txParams, ledgerIndex)
            .then((result) => {
                console.log(result);
                if (result === OperationStatus.ERROR) {
                    Alert('error', "Sign Transaction Error", "Please try again.");
                } else {
                    setTxnId(result)
                }
            }).finally(() => {
                setIsPending('');
            }));
    }

    const handleClose = () => {
        // txn success
        // invoke dashbaord methods
        if (txnId) {
            updateRecentTransactions(TransactionType.TRANSFER_STAKE, txnId);
            updateData();
        }
        
        // reset state
        // timeout to wait for modal to fade out before clearing
        // so that the animation is smoother
        toast.dismiss();
        setTimeout(() => {
            setToSsn('');
            setToSsnName('');
            setTxnId('');
            setDelegAmt('');
            setShowNodeSelector(false);
        }, 150);
    }

    // row contains a json from react-table, similar to the react-table header declaration
    const handleNodeSelect = (row: any) => {
        setToSsn(row.address);
        setToSsnName(row.name);
        // reset the view
        toggleNodeSelector();
    }

    const handleDelegAmt = (e: any) => {
        setDelegAmt(e.target.value);
    }

    const toggleNodeSelector = () => {
        console.log("toggle node selector: %o", showNodeSelector);
        setShowNodeSelector(!showNodeSelector);
    }

    const columns = useMemo(
        () => [
            {
                Header: 'name',
                accessor: 'name'
            },
            {
                Header: 'address',
                accessor: 'address',
                Cell: ({ row }: any) => 
                    <>
                    <span data-tip={row.original.address}>
                        {getTruncatedAddress(row.original.address)}
                    </span>
                    <ReactTooltip place="bottom" type="dark" effect="float" />
                    </>
            },
            {
                Header: 'Delegators',
                accessor: 'delegNum',
            },
            {
                Header: 'Stake Amount (ZIL)',
                accessor: 'stakeAmt',
                Cell: ({ row }: any) => 
                    <>
                    <span>{convertQaToCommaStr(row.original.stakeAmt)}</span>
                    </>
            },
            {
                Header: 'Comm. Rate (%)',
                accessor: 'commRate',
                Cell: ({ row }: any) =>
                    <span>{convertToProperCommRate(row.original.commRate).toFixed(2)}</span>
            }
            // eslint-disable-next-line
        ], []
    )

    return (
        <div id="redeleg-stake-modal" className="modal fade" tabIndex={-1} role="dialog" aria-labelledby="redelegModalLabel" aria-hidden="true">
            <div className="contract-calls-modal modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    {
                        isPending ?

                        <ModalPending />

                        :

                        txnId ?

                        <ModalSent txnId={txnId} networkURL={networkURL} handleClose={handleClose}/>

                        :

                        <>
                        <div className="modal-header">
                            <h5 className="modal-title" id="withdrawRewardModalLabel">Transfer Stake</h5>
                            <button type="button" className="close btn shadow-none" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {
                                !showNodeSelector &&
                                <>
                                    {/* sender */}
                                    <small><strong>From</strong></small>
                                    <div className="row node-details-wrapper mb-4">
                                        <div className="col node-details-panel mr-4">
                                            <h3>{transferStakeModalData.ssnName}</h3>
                                            <span>{transferStakeModalData.ssnAddress}</span>
                                        </div>
                                        <div className="col node-details-panel">
                                            <h3>Current Deposit</h3>
                                            <span>{convertQaToCommaStr(transferStakeModalData.delegAmt)} ZIL</span>
                                        </div>
                                    </div>

                                    {/* recipient*/}
                                    <small><strong>To</strong></small>
                                    
                                    {!toSsn &&
                                        <button type="button" className="mb-4 btn btn-contract btn-block shadow-none" onClick={() => toggleNodeSelector()}>Select a node</button>
                                    }

                                    { toSsn &&
                                        <>
                                        <div className="row node-details-wrapper mb-4">
                                            <div className="col node-details-panel">
                                                <h3>{toSsnName}</h3>
                                                <span>{toSsn}</span>
                                                <button type="button" className="btn btn-change-node shadow-none" onClick={() => toggleNodeSelector()}>Change</button>
                                            </div>
                                        </div>

                                        <div className="input-group mb-4">
                                            <input type="text" className="form-control shadow-none" value={delegAmt} onChange={handleDelegAmt} placeholder="Enter amount to transfer" />
                                            <div className="input-group-append">
                                                <span className="input-group-text pl-4 pr-3">ZIL</span>
                                            </div>
                                        </div>
                                        </>
                                    }

                                    <div className="d-flex">
                                        <button type="button" className="btn btn-user-action mt-2 mx-auto shadow-none" onClick={redeleg}>Transfer Stake</button>
                                    </div>
                                </>
                            }

                            {
                                showNodeSelector &&

                                <>
                                    <h2 className="node-details-subheading mb-2">Select a node to transfer to</h2>
                                    <div id="transfer-stake-details">
                                        <Table columns={columns} data={nodeSelectorOptions} senderAddress={transferStakeModalData.ssnAddress} handleNodeSelect={handleNodeSelect}/>
                                    </div>
                                    <div className="d-flex">
                                        <button type="button" className="btn btn-user-action-cancel mt-4 mx-auto shadow-none" onClick={() => toggleNodeSelector()}>Back</button>
                                    </div>
                                </>
                            }

                        </div>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}

export default ReDelegateStakeModal;