import React, { useContext, useEffect, useRef, useState } from 'react';
import { trackPromise } from 'react-promise-tracker';

import AppContext from "../contexts/appContext";
import { PromiseArea, Role } from '../util/enum';
import { convertToProperCommRate } from '../util/utils';
import * as ZilliqaAccount from "../account";
import RecentTransactionsTable from './recent-transactions-table';
import SsnTable from './ssn-table';

import { BN, units } from '@zilliqa-js/util';
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';

import WithdrawCommModal from './contract-calls/withdraw-comm';
import UpdateReceiverAddress from './contract-calls/update-receiver-address';
import UpdateCommRateModal from './contract-calls/update-commission-rate';

import DelegateStakeModal from './contract-calls/delegate-stake';
import WithdrawStakeModal from './contract-calls/withdraw-stake';
import WithdrawRewardModal from './contract-calls/withdraw-reward';
import CompleteWithdrawModal from './contract-calls/complete-withdraw';

import logo from "../static/logo.png";


function Dashboard(props: any) {

    const appContext = useContext(AppContext);
    const { address, isAuth, role, network } = appContext;
    const [balance, setBalance] = useState("");
    const [selectedNetwork, setSelectedNetwork] = useState(network);
    const [recentTransactions, setRecentTransactions] = useState([] as any);
    const [error, setError] = useState('');

    // config.js from public folder
    const { blockchain_explorer_config, networks_config, refresh_rate_config } = (window as { [key: string]: any })['config'];
    const proxy = networks_config[network].proxy;
    const networkURL = networks_config[network].blockchain;

    const mountedRef = useRef(false);

    const [nodeDetails, setNodeDetails] = useState({
        stakeAmt: '0',
        bufferedDeposit: '0',
        commRate: 0,
        commReward: '0',
        numOfDeleg: 0,
        receiver: ''
    });

    const cleanUp = () => {
        ZilliqaAccount.cleanUp();
        appContext.cleanUp();
        console.log("directing to dashboard");
        props.history.replace("/");
    }

    const handleChangeNetwork = (e: any) => {
        setSelectedNetwork(e.target.value);
        ZilliqaAccount.changeNetwork(e.target.value);
    }

    const handleError = () => {
        setError('error');
    }

    const refreshStats = async () => {
        setError('');

        // get account balance
        trackPromise(ZilliqaAccount.getBalance(address).then((balance) => {
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
        if (process.env.REACT_APP_STAKEZ_ENV && process.env.REACT_APP_STAKEZ_ENV === 'dev') {
            // disable auth check for development
            return;
        }

        if (!isAuth) {
            // redirect to login request
            props.history.push("/notlogin");
        }
        return () => {
            mountedRef.current = false;
        }
    });

    // set network that is selected from home page
    useEffect(() => {
        // network in context is set
        if (network) {
            ZilliqaAccount.changeNetwork(networkURL);
        }
    }, [network]);

    // when selected network is changed
    // useEffect is executed again
    useEffect(() => {
        console.log("dashboard use effect running");
        console.log("dashboard address: %o", address);
        console.log("dashboard role: %o", role);
        console.log("dashboard proxy :%o", proxy);
        console.log("dashboard networkURL :%o", networkURL);

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
                const contract = await ZilliqaAccount.getSsnImplContract(proxy, networkURL);
                if (contract === 'error') {
                    return;
                }

                if (contract.ssnlist && contract.ssnlist.hasOwnProperty(userAddressBase16)) {
                    console.log("attempt to fetch node details");

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
                            commRate: convertToProperCommRate(ssnArgs[7]),
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

        // refresh wallet
        // refresh operator details
        const intervalId = setInterval(async () => {
            getOperatorNodeDetails();
            refreshStats();
        }, (2 * refresh_rate_config));

        return () => {
            clearInterval(intervalId);
            mountedRef.current = false;
        }

    }, [selectedNetwork]);


    return (
        <>
        <nav className="navbar navbar-expand-lg navbar-dark">
            <a className="navbar-brand" href="#" onClick={refreshStats}><span><img className="logo mx-auto" src={logo} alt="zilliqa_logo"/><span className="navbar-title">ZILLIQA STAKING</span></span></a>
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
                        { network === 'testnet' && <p className="px-1">Testnet</p> }
                        { network === 'mainnet' && <p className="px-1">Mainnet</p> }
                        { network === 'isolated_server' && <p className="px-1">Isolated Server</p> }
                    </li>
                    <li className="nav-item">
                        <button type="button" className="btn btn-sign-out mx-2" onClick={cleanUp}>Sign Out</button>
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
                                    (role === Role.DELEGATOR) &&

                                    <>
                                    {/* delegator section */}
                                    <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                        <h5 className="card-title mb-4">Delegator, What would you like to do today?</h5>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#delegate-stake-modal" data-keyboard="false" data-backdrop="static">Delegate Stake</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-stake-modal" data-keyboard="false" data-backdrop="static">Withdraw Stake</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-reward-modal" data-keyboard="false" data-backdrop="static">Withdraw Rewards</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#complete-withdrawal-modal" data-keyboard="false" data-backdrop="static">Complete Withdrawal</button>
                                    </div>
                                    </>
                                }

                                {
                                    (role === Role.OPERATOR) &&

                                    <>
                                    {/* node operator section */}

                                    <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                        <h5 className="card-title mb-4">Operator, What would you like to do today?</h5>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-comm-rate-modal" data-keyboard="false" data-backdrop="static">Update Commission</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-recv-addr-modal" data-keyboard="false" data-backdrop="static">Update Received Address</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-comm-modal" data-keyboard="false" data-backdrop="static">Withdraw Commission</button>
                                    </div>
                                    </>
                                }

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
                                            { mountedRef.current && <SsnTable proxy={proxy} network={networkURL} blockchainExplorer={blockchain_explorer_config} refresh={refresh_rate_config} /> }
                                        </div>
                                    </div>
                                </div>

                                <div id="dashboard-recent-txn" className="p-4 mb-4 bg-white rounded dashboard-card container-fluid">
                                    <div className="row">
                                        <div className="col">
                                            <h5 className="card-title mb-4">Recent Transactions</h5>
                                        </div>
                                        <div className="col-12 text-left">
                                            { recentTransactions.length === 0 && <p><em>No recent transactions.</em></p> }
                                            { recentTransactions.length !== 0 && mountedRef.current && <RecentTransactionsTable data={recentTransactions} network={networkURL} blockchainExplorer={blockchain_explorer_config} /> }
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <UpdateCommRateModal proxy={proxy} networkURL={networkURL} currentRate={nodeDetails.commRate} onSuccessCallback={updateRecentTransactions} />
            <UpdateReceiverAddress proxy={proxy} networkURL={networkURL} currentReceiver={nodeDetails.receiver} onSuccessCallback={updateRecentTransactions} />
            <WithdrawCommModal proxy={proxy} networkURL={networkURL} currentRewards={nodeDetails.commReward} onSuccessCallback={updateRecentTransactions} />
            <DelegateStakeModal proxy={proxy} networkURL={networkURL} onSuccessCallback={updateRecentTransactions} />
            <WithdrawStakeModal proxy={proxy} networkURL={networkURL} onSuccessCallback={updateRecentTransactions} />
            <WithdrawRewardModal proxy={proxy} networkURL={networkURL} onSuccessCallback={updateRecentTransactions} />
            <CompleteWithdrawModal proxy={proxy} networkURL={networkURL} onSuccessCallback={updateRecentTransactions} />
        </div>
        </>
    );
}

export default Dashboard;