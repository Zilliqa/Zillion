import React, { useContext, useEffect, useRef, useState } from 'react';
import { trackPromise } from 'react-promise-tracker';

import AppContext from "../contexts/appContext";
import { Network, PromiseArea, Role } from '../util/enum';
import * as Account from "../account";
import RecentTransactionsTable from './recent-transactions-table';
import SsnTable from './ssn-table';

import { BN, units } from '@zilliqa-js/util';
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';

import WithdrawCommModal from './contract-calls/withdraw-comm';
import UpdateReceiverAddress from './contract-calls/update-receiver-address';
import UpdateCommRateModal from './contract-calls/update-commission-rate';

import logo from "../static/logo.png";

const PROXY = process.env.REACT_APP_PROXY ? process.env.REACT_APP_PROXY : '';
const BLOCKCHAIN_NETWORK = process.env.REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK ? process.env.REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK : '';


function Dashboard(props: any) {

    const appContext = useContext(AppContext);
    const { address, isAuth, role } = appContext;
    const [balance, setBalance] = useState("");
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [recentTransactions, setRecentTransactions] = useState([] as any);
    const [error, setError] = useState('');

    const mountedRef = useRef(false);

    const [nodeDetails, setNodeDetails] = useState({
        stakeAmt: '',
        bufferedDeposit: '',
        commRate: '',
        commReward: '',
        numOfDeleg: 0,
        receiver: ''
    });

    const handleChangeNetwork = (e: any) => {
        setSelectedNetwork(e.target.value);
        Account.changeNetwork(e.target.value);
    }

    const handleError = () => {
        setError('error');
    }

    const refreshStats = async () => {
        setError('');

        // get account balance
        trackPromise(Account.getBalance(address).then((balance) => {
            const zilBalance = units.fromQa(new BN(balance), units.Units.Zil);
            console.log("retrieving balance: %o", zilBalance);
            
            if (mountedRef.current) {
                setBalance(zilBalance);
            }
            
        }), PromiseArea.PROMISE_GET_BALANCE);
    }

    const updateRecentTransactions = (txnId: string) => {
        setRecentTransactions([...recentTransactions.reverse(), {txnId: txnId}].reverse());
    }

    useEffect(() => {
        // if (!isAuth) {
        //     // redirect to ask to login
        //     props.history.push("/notlogin");
        // }
        // return () => {
        //     mountedRef.current = false;
        // }
    });

    // when selected network is changed
    // useEffect is executed again
    useEffect(() => {
        console.log("dashboard use effect running");
        console.log("dashboard address: %o", address);
        console.log("dashboard role: %o", role);
        console.log("dashboard proxy: %o", PROXY);
        console.log("dashboard network :%o", BLOCKCHAIN_NETWORK);

        mountedRef.current = true;

        // check operator is indeed operator
        async function getOperatorNodeDetails() {
            // convert user wallet address to base16
            // contract address is in base16
            let userAddressBase16 = '';

            if (!address) {
                return;
            }

            userAddressBase16 = fromBech32Address(address).toLowerCase();

            if (role === Role.OPERATOR) {
                const contract = await Account.getSsnImplContract(PROXY, BLOCKCHAIN_NETWORK);
                if (contract === 'error') {
                    return;
                }

                if (contract.ssnlist && contract.ssnlist.hasOwnProperty(userAddressBase16)) {
                    // since user is node operator
                    // compute the data for staking peformance section
                    let tempNumOfDeleg = 0;
                    const ssnArgs = contract.ssnlist[userAddressBase16].arguments;

                    // get number of delegators
                    if (contract.hasOwnProperty("ssn_deleg_amt") && contract.ssn_deleg_amt.hasOwnProperty(userAddressBase16)) {
                        tempNumOfDeleg = Object.keys(contract.ssn_deleg_amt[userAddressBase16]).length;
                    }

                    if (mountedRef.current) {
                        console.log("updating node details");

                        setNodeDetails(prevNodeDetails => ({
                            ...prevNodeDetails,
                            stakeAmt: units.fromQa(new BN(ssnArgs[1]), units.Units.Zil),
                            bufferedDeposit: units.fromQa(new BN(ssnArgs[6]), units.Units.Zil),
                            commRate: ssnArgs[7],
                            commReward: units.fromQa(new BN(ssnArgs[8]), units.Units.Zil),
                            numOfDeleg: tempNumOfDeleg,
                            receiver: toBech32Address(ssnArgs[9])
                        }));
                    }

                }
            }
        }

        getOperatorNodeDetails();
        refreshStats();

        return () => {
            mountedRef.current = false;
        }

    }, [selectedNetwork]);

    return (
        <>
        <nav className="navbar navbar-expand-lg navbar-dark">
            <a className="navbar-brand" href="" onClick={refreshStats}><span><img className="logo mx-auto" src={logo} alt="zilliqa_logo"/><span className="navbar-title">ZILLIQA STAKING</span></span></a>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarSupportedContent">
                <ul className="navbar-nav mr-auto">
                    <li className="nav-item active">
                        <button type="button" className="nav-link btn" onClick={refreshStats}>Dashboard <span className="sr-only">(current)</span></button>
                    </li>
                </ul>
                <ul className="navbar-nav navbar-right">
                    <li className="nav-item">
                        <p className="px-1">{address ? address : 'No wallet detected'}</p>
                    </li>
                    <li className="nav-item">
                        <p className="px-1">{balance ? balance : '0.000'} ZIL</p>
                    </li>
                    <li className="nav-item">
                        <div className="form-group mt-1 ml-2">
                            <select id="network" value={selectedNetwork} onChange={handleChangeNetwork} className="form-control">
                                <option value={Network.TESTNET}>Testnet</option>
                                <option value={Network.MAINNET}>Mainnet</option>
                                <option value={Network.ISOLATED_SERVER}>Isolated Server</option>
                            </select>
                        </div>
                    </li>
                </ul>
            </div>
        </nav>
        <div id="dashboard" className="container-fluid h-100">
            <div className="row h-100">
                <div id="content" className="col pt-4">
                    <div className="container-xl">
                        <div className="row">
                            <div className="col-12">
                                <h1 className="mb-4">Stake$ZIL Dashboard</h1>

                                {
                                    (role === Role.OPERATOR) &&

                                    <div className="p-4 mb-4 rounded bg-white dashboard-card container-fluid">
                                        <h5 className="card-title mb-4">Staking Performance</h5>
                                        <div className="row">
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Stake Amount</h4>
                                                <p>{nodeDetails.stakeAmt} ZIL</p>
                                            </div>
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Buffered Deposit</h4>
                                                <p>{nodeDetails.bufferedDeposit} ZIL</p>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Delegators</h4>
                                                <p>{nodeDetails.numOfDeleg}</p>
                                            </div>
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Commission Rate</h4>
                                                <p>{nodeDetails.commRate}%</p>
                                            </div>
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Commission Reward</h4>
                                                <p>{nodeDetails.commReward} ZIL</p>
                                            </div>
                                        </div>
                                    </div>
                                }

                                <div id="dashboard-ssn-details" className="p-4 mb-4 bg-white rounded dashboard-card container-fluid">
                                    <div className="row">
                                        <div className="col">
                                            <h5 className="card-title mb-4">Other Staked Seed Nodes</h5>
                                        </div>
                                        <div className="col-12 text-center">
                                            { mountedRef.current && <SsnTable proxy={PROXY} network={selectedNetwork} refresh={process.env.REACT_APP_DATA_REFRESH_RATE} /> }
                                        </div>
                                    </div>
                                </div>

                                {
                                    (role === Role.OPERATOR) &&

                                    <>
                                    {/* node operator section */}

                                    <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                        <h5 className="card-title mb-4">What would you like to do today?</h5>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-comm-rate-modal" data-keyboard="false" data-backdrop="static">Update Commission</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-recv-addr-modal" data-keyboard="false" data-backdrop="static">Update Received Address</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-comm-modal" data-keyboard="false" data-backdrop="static">Withdraw Commission</button>
                                    </div>
                                    </>
                                }

                                <div id="dashboard-recent-txn" className="p-4 mb-4 bg-white rounded dashboard-card container-fluid">
                                    <div className="row">
                                        <div className="col">
                                            <h5 className="card-title mb-4">Recent Transactions</h5>
                                        </div>
                                        <div className="col-12 text-left">
                                            { recentTransactions.length === 0 && <p><em>No recent transactions.</em></p> }
                                            { recentTransactions.length !== 0 && mountedRef.current && <RecentTransactionsTable data={recentTransactions} network={BLOCKCHAIN_NETWORK}/> }
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <UpdateCommRateModal proxy={PROXY} networkURL={BLOCKCHAIN_NETWORK} currentRate={nodeDetails.commRate} onSuccessCallback={updateRecentTransactions} />
            <UpdateReceiverAddress proxy={PROXY} networkURL={BLOCKCHAIN_NETWORK} currentReceiver={nodeDetails.receiver} onSuccessCallback={updateRecentTransactions} />
            <WithdrawCommModal proxy={PROXY} networkURL={BLOCKCHAIN_NETWORK} currentRewards={nodeDetails.commReward} onSuccessCallback={updateRecentTransactions} />
            {/* <DelegateStakeModal proxy={PROXY} networkURL={BLOCKCHAIN_NETWORK} onSuccessCallback={updateRecentTransactions} /> */}
        </div>
        </>
    );
}

export default Dashboard;