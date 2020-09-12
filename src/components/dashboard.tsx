import React, { useContext, useEffect, useRef, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import AppContext from "../contexts/appContext";
import { PromiseArea, Role, NetworkURL, Network as NetworkLabel, AccessMethod } from '../util/enum';
import { convertToProperCommRate, convertQaToCommaStr } from '../util/utils';
import * as ZilliqaAccount from "../account";
import RecentTransactionsTable from './recent-transactions-table';
import SsnTable from './ssn-table';
import Alert from './alert';

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


interface NodeOptions {
    label: string,
    value: string,
}


function Dashboard(props: any) {

    const appContext = useContext(AppContext);
    const { accountType, address, isAuth, role, ledgerIndex, network, initParams, updateRole, updateNetwork } = appContext;


    const [currWalletAddress, setCurrWalletAddress] = useState(address); // keep track of current wallet as zilpay have multiple wallets
    const [currRole, setCurrRole] = useState(role);

    const [balance, setBalance] = useState("");
    const [recentTransactions, setRecentTransactions] = useState([] as any);

    // config.js from public folder
    const { blockchain_explorer_config, networks_config, refresh_rate_config, production_config } = (window as { [key: string]: any })['config'];
    const [proxy, setProxy] = useState(networks_config[network].proxy);

    const [networkURL, setNetworkURL] = useState(networks_config[network].blockchain);

    const mountedRef = useRef(false);

    const [nodeDetails, setNodeDetails] = useState({
        name: '',
        stakeAmt: '0',
        bufferedDeposit: '0',
        commRate: 0,
        commReward: '0',
        numOfDeleg: 0,
        receiver: ''
    });

    const [nodeOptions, setNodeOptions] = useState([] as NodeOptions[]);

    const cleanUp = () => {
        ZilliqaAccount.cleanUp();
        appContext.cleanUp();
        console.log("directing to dashboard");
        props.history.replace("/");
    }

    const handleChangeNetwork = React.useCallback((value: string) => {
        // e.target.value is network URL
        setNetworkURL(value);
        ZilliqaAccount.changeNetwork(value);

        // update the context to be safe
        // context reads the network label not url
        // probably no need to update 
        // as networkURL is passed down from here onwards
        let networkLabel = "";
        switch (value) {
            case NetworkURL.TESTNET:
                networkLabel = NetworkLabel.TESTNET;
                break;
            case NetworkURL.MAINNET:
                networkLabel = NetworkLabel.MAINNET;
                break;
            case NetworkURL.ISOLATED_SERVER:
                networkLabel = NetworkLabel.ISOLATED_SERVER;
                break;
            default:
                networkLabel = NetworkLabel.TESTNET
                break;
        }
        updateNetwork(networkLabel);

        // update the proxy contract state
        setProxy(networks_config[networkLabel].proxy);
    }, [updateNetwork, networks_config]);


    const getAccountBalance = async () => {
        trackPromise(ZilliqaAccount.getBalance(currWalletAddress).then((balance) => {
            console.log("retrieving balance: %o", balance);
            
            if (mountedRef.current) {
                setBalance(balance);
            }
            
        }), PromiseArea.PROMISE_GET_BALANCE);
    }

    const updateRecentTransactions = (txnId: string) => {
        setRecentTransactions([...recentTransactions.reverse(), {txnId: txnId}].reverse());
    }

    /**
     * When document has loaded, it start to observable network form zilpay.
     */
    useEffect(() => {
        if (accountType === AccessMethod.ZILPAY) {
            const zilPay = (window as any).zilPay;
            const accountStreamChanged = zilPay.wallet.observableAccount();
            const networkStreamChanged = zilPay.wallet.observableNetwork();

            if (zilPay) {

                networkStreamChanged.subscribe((net: string) => {
                    switch (net) {
                        case NetworkLabel.MAINNET:
                            // do nothing
                            break;
                        case NetworkLabel.TESTNET:
                        case NetworkLabel.ISOLATED_SERVER:
                        case NetworkLabel.PRIVATE:
                            if (production_config) {
                                // warn users not to switch to testnet on production
                                Alert("warn", "Testnet is not supported. Please switch to Mainnet.");
                            }
                            break;
                        default:
                            break;
                    }
                });
                
                accountStreamChanged.subscribe(async (account: any) => {
                    initParams(account.base16, role, AccessMethod.ZILPAY);
                    let newRole = "";
                    const isOperator = await ZilliqaAccount.isOperator(proxy, account.base16.toLowerCase(), networkURL);
                    if (role === Role.OPERATOR && isOperator) {
                        newRole = Role.OPERATOR;
                    } else {
                        newRole = Role.DELEGATOR;
                    }
                    setCurrRole(newRole);
                    updateRole(account.base16, newRole);
                    setCurrWalletAddress(toBech32Address(account.base16));
                });
            }

            return () => {
                accountStreamChanged.unsubscribe();
                networkStreamChanged.unsubscribe();
            };
        }
    }, []);

    useEffect(() => {
        if (production_config === false) {
            // disable auth check for development
            return;
        }

        if (!isAuth) {
            // redirect to login request
            props.history.push("/notlogin");
        }
        // eslint-disable-next-line
    }, []);

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

        mountedRef.current = true;

        // check operator is indeed operator
        async function getOperatorNodeDetails() {
            console.log("get node operator node details: %o", currWalletAddress);
            console.log("get node operator node details: %o", proxy);
            console.log("get node operator node details: %o", currRole);
            console.log("get node operator node details: %o", networkURL);

            // convert user wallet address to base16
            // contract address is in base16
            let userAddressBase16 = '';

            if (!currWalletAddress) {
                return;
            }

            userAddressBase16 = fromBech32Address(currWalletAddress).toLowerCase();

            if (currRole === Role.OPERATOR) {
                const contract = await ZilliqaAccount.getSsnImplContract(proxy, networkURL);
                
                if (contract === undefined || contract === 'error') {
                    return null;
                }

                if (contract.hasOwnProperty('ssnlist') && contract.ssnlist.hasOwnProperty(userAddressBase16)) {
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
                            name: ssnArgs[3],
                            stakeAmt: ssnArgs[1],
                            bufferedDeposit: ssnArgs[6],
                            commRate: ssnArgs[7],
                            commReward: ssnArgs[8],
                            numOfDeleg: tempNumOfDeleg,
                            receiver: toBech32Address(ssnArgs[9])
                        }));
                    }

                }
            } else {
                if (mountedRef.current) {
                    setNodeDetails(prevNodeDetails => ({
                        ...prevNodeDetails,
                        stakeAmt: '0',
                        bufferedDeposit: '0',
                        commRate: 0,
                        commReward: '0',
                        numOfDeleg: 0,
                        receiver: ''
                    }));
                }
            }
        }

        // generate options list
        // fetch node operator names and address
        async function getNodeOptions() {
            console.log("generate form node options");
            const contract = await ZilliqaAccount.getSsnImplContract(proxy, networkURL);
            
            if (contract === undefined || contract === 'error') {
                return null;
            }

            if (contract.hasOwnProperty('ssnlist')) {
                let tempNodeOptions = [];
                for (const operatorAddr in contract.ssnlist) {
                    if (!contract.ssnlist.hasOwnProperty(operatorAddr)) {
                        continue;
                    }
                    const operatorName = contract.ssnlist[operatorAddr].arguments[3];
                    const operatorBech32Addr = toBech32Address(operatorAddr);
                    const operatorOption: NodeOptions = {
                        label: operatorName + ": " + operatorBech32Addr,
                        value: operatorAddr
                    }
                    tempNodeOptions.push(operatorOption);
                }
                setNodeOptions([...tempNodeOptions]);
            }
        }

        getOperatorNodeDetails();
        getAccountBalance();
        getNodeOptions();

        // refresh wallet
        // refresh operator details
        const intervalId = setInterval(async () => {
            getOperatorNodeDetails();
            getAccountBalance();
            getNodeOptions();
        }, (2 * refresh_rate_config));

        return () => {
            clearInterval(intervalId);
            mountedRef.current = false;
        }

    }, [networkURL, currWalletAddress]);


    return (
        <>
        <nav className="navbar navbar-expand-lg navbar-dark">
            <a className="navbar-brand" href="#" onClick={getAccountBalance}><span><img className="logo mx-auto" src={logo} alt="zilliqa_logo"/><span className="navbar-title">ZILLIQA STAKING</span></span></a>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarSupportedContent">
                <ul className="navbar-nav mr-auto">
                    <li className="nav-item active">
                        <button type="button" className="nav-link btn" onClick={getAccountBalance}>Dashboard <span className="sr-only">(current)</span></button>
                    </li>
                </ul>
                <ul className="navbar-nav navbar-right">
                    <li className="nav-item">
                        <p className="px-1">{currWalletAddress ? currWalletAddress : 'No wallet detected'}</p>
                    </li>
                    <li className="nav-item">
                        <p className="px-1">{balance ? convertQaToCommaStr(balance) : '0.000'} ZIL</p>
                    </li>
                    <li className="nav-item">
                        { networkURL === NetworkURL.TESTNET && <p className="px-1">Testnet</p> }
                        { networkURL === NetworkURL.MAINNET && <p className="px-1">Mainnet</p> }
                        { networkURL === NetworkURL.ISOLATED_SERVER && <p className="px-1">Isolated Server</p> }
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
                                <h1 className="mb-4">Zillion Dashboard</h1>

                                {
                                    (currRole === Role.DELEGATOR) &&

                                    <>
                                    {/* delegator section */}
                                    <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                        <h5 className="card-title mb-4">Hi Delegator! What would you like to do today?</h5>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#delegate-stake-modal" data-keyboard="false" data-backdrop="static">Delegate Stake</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-stake-modal" data-keyboard="false" data-backdrop="static">Withdraw Stake</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-reward-modal" data-keyboard="false" data-backdrop="static">Withdraw Rewards</button>
                                        {/* <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#complete-withdrawal-modal" data-keyboard="false" data-backdrop="static">Complete Withdrawal</button> */}
                                    </div>
                                    </>
                                }

                                {
                                    (currRole === Role.OPERATOR) &&

                                    <>
                                    {/* node operator section */}

                                    <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                        <h5 className="card-title mb-4">Hi {nodeDetails.name ? nodeDetails.name : 'Operator'}! What would you like to do today?</h5>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-comm-rate-modal" data-keyboard="false" data-backdrop="static">Update Commission</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-recv-addr-modal" data-keyboard="false" data-backdrop="static">Update Receiving Address</button>
                                        <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-comm-modal" data-keyboard="false" data-backdrop="static">Withdraw Commission</button>
                                    </div>
                                    </>
                                }

                                {
                                    (currRole === Role.DELEGATOR) &&
                                    <>
                                    {/* delegator statistics */}

                                    {/* <div className="p-4 mb-4 rounded bg-white dashboard-card container-fluid">
                                        <h5 className="card-title mb-4">Delegator Statistics</h5>
                                        <div className="row">

                                        </div>
                                    </div> */}
                                    </>
                                }

                                {/* operator statistics */}
                                {
                                    (currRole === Role.OPERATOR) &&
                                    <div className="p-4 mb-4 rounded bg-white dashboard-card container-fluid">
                                        <h5 className="card-title mb-4">Staking Performance</h5>
                                        <div className="row">
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Stake Amount</h4>
                                                <p>{convertQaToCommaStr(nodeDetails.stakeAmt)} ZIL</p>
                                            </div>
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Buffered Deposit</h4>
                                                <p>{convertQaToCommaStr(nodeDetails.bufferedDeposit)} ZIL</p>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Delegators</h4>
                                                <p>{nodeDetails.numOfDeleg}</p>
                                            </div>
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Commission Rate</h4>
                                                <p>{convertToProperCommRate(nodeDetails.commRate.toString()).toFixed(2)}%</p>
                                            </div>
                                            <div className="col performance-stats rounded pt-3 pl-4 m-2">
                                                <h4>Commission Reward</h4>
                                                <p>{convertQaToCommaStr(nodeDetails.commReward)} ZIL</p>
                                            </div>
                                        </div>
                                    </div>
                                }

                                <div id="dashboard-ssn-details" className="p-4 mb-4 bg-white rounded dashboard-card container-fluid">
                                    <div className="row">
                                        <div className="col">
                                            <h5 className="card-title mb-4">Staked Seed Nodes</h5>
                                        </div>
                                        <div className="col-12 text-center">
                                            { mountedRef.current && <SsnTable proxy={proxy} network={networkURL} blockchainExplorer={blockchain_explorer_config} refresh={refresh_rate_config} currRole={currRole} /> }
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
                    <ToastContainer hideProgressBar={true}/>
                </div>
            </div>
            <UpdateCommRateModal proxy={proxy} networkURL={networkURL} currentRate={nodeDetails.commRate} onSuccessCallback={updateRecentTransactions} ledgerIndex={ledgerIndex} />
            <UpdateReceiverAddress proxy={proxy} networkURL={networkURL} currentReceiver={nodeDetails.receiver} onSuccessCallback={updateRecentTransactions} ledgerIndex={ledgerIndex} />
            <WithdrawCommModal proxy={proxy} networkURL={networkURL} currentRewards={nodeDetails.commReward} onSuccessCallback={updateRecentTransactions} ledgerIndex={ledgerIndex} />
            <DelegateStakeModal proxy={proxy} networkURL={networkURL} onSuccessCallback={updateRecentTransactions} ledgerIndex={ledgerIndex} nodeSelectorOptions={nodeOptions} />
            <WithdrawStakeModal proxy={proxy} networkURL={networkURL} onSuccessCallback={updateRecentTransactions} ledgerIndex={ledgerIndex} nodeSelectorOptions={nodeOptions} />
            <WithdrawRewardModal proxy={proxy} networkURL={networkURL} onSuccessCallback={updateRecentTransactions} ledgerIndex={ledgerIndex} nodeSelectorOptions={nodeOptions} />
            <CompleteWithdrawModal proxy={proxy} networkURL={networkURL} onSuccessCallback={updateRecentTransactions} ledgerIndex={ledgerIndex} />
        </div>
        </>
    );
}

export default Dashboard;