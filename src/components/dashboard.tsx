import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';

import AppContext from "../contexts/appContext";
import { PromiseArea, Role, NetworkURL, Network as NetworkLabel, AccessMethod, Environment } from '../util/enum';
import { convertQaToCommaStr, getAddressLink } from '../util/utils';
import * as ZilliqaAccount from "../account";
import RecentTransactionsTable from './recent-transactions-table';
import StakingPortfolio from './staking-portfolio';
import SsnTable from './ssn-table';
import Alert from './alert';

import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';

import WithdrawCommModal from './contract-calls/withdraw-comm';
import UpdateReceiverAddress from './contract-calls/update-receiver-address';
import UpdateCommRateModal from './contract-calls/update-commission-rate';

import DelegateStakeModal from './contract-calls/delegate-stake';
import ReDelegateStakeModal from './contract-calls/redeleg';
import WithdrawStakeModal from './contract-calls/withdraw-stake';
import WithdrawRewardModal from './contract-calls/withdraw-reward';
import CompleteWithdrawModal from './contract-calls/complete-withdraw';

import logo from "../static/logo.png";
import DisclaimerModal from './disclaimer';
import DelegatorStatsTable from './delegator-stats-table';
import OperatorStatsTable from './operator-stats-table';
import { useInterval } from '../util/use-interval';


interface NodeOptions {
    label: string,
    value: string,
}


function Dashboard(props: any) {

    const appContext = useContext(AppContext);
    const { accountType, address, isAuth, loginRole, ledgerIndex, network, initParams, updateNetwork } = appContext;


    const [currWalletAddress, setCurrWalletAddress] = useState(address); // keep track of current wallet as zilpay have multiple wallets
    const [currRole, setCurrRole] = useState(loginRole);

    const [balance, setBalance] = useState("");
    const [recentTransactions, setRecentTransactions] = useState([] as any);

    // config.js from public folder
    const { blockchain_explorer_config, networks_config, refresh_rate_config, environment_config } = (window as { [key: string]: any })['config'];
    const [proxy, setProxy] = useState(networks_config[network].proxy);

    const [networkURL, setNetworkURL] = useState(networks_config[network].blockchain);

    const mountedRef = useRef(true);

    // used as info for the internal modal data
    // state is updated by OperatorStatsTable
    const [nodeDetails, setNodeDetails] = useState({
        name: '',
        stakeAmount: '0',
        bufferedDeposit: '0',
        commRate: '0',
        commReward: '0',
        numOfDeleg: '0',
        receiver: ''
    });

    const [nodeOptions, setNodeOptions] = useState([] as NodeOptions[]);

    const cleanUp = () => {
        ZilliqaAccount.cleanUp();
        appContext.cleanUp();
        console.log("directing to dashboard");
        props.history.replace("/");
    }

    // eslint-disable-next-line
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


    const getAccountBalance = useCallback(() => {
        let currBalance = '0';

        trackPromise(ZilliqaAccount.getBalance(currWalletAddress)
            .then((balance) => {
                currBalance = balance;
            })
            .finally(() => {
                if (mountedRef.current) {
                    console.log("updating balance...proxy: %o, network: %o", proxy, networkURL);
                    setBalance(currBalance);
                }

            }), PromiseArea.PROMISE_GET_BALANCE);
    }, [proxy, networkURL, currWalletAddress]);


    // generate options list
    // fetch node operator names and address 
    // for the dropdowns in the modals
    const getNodeOptionsList = useCallback(() => {
        let tempNodeOptions: NodeOptions[] = [];
        
        ZilliqaAccount.getSsnImplContract(proxy, networkURL)
            .then((contract) => {

                if (contract === undefined || contract === 'error') {
                    return null;
                }

                if (contract.hasOwnProperty('ssnlist')) {
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
                }
            })
            .finally(() => {
                if (!mountedRef.current) {
                    return null;
                }
                setNodeOptions([...tempNodeOptions]);
            });
    }, [proxy, networkURL]);

    const updateRecentTransactions = (txnId: string) => {
        setRecentTransactions([...recentTransactions.reverse(), {txnId: txnId}].reverse());
    }

    // update current role is used for ZilPay
    // due to account switch on the fly
    // role is always compared against the selected role at home page
    const updateCurrentRole = async (userBase16Address: string) => {
        let newRole = "";
        const isOperator = await ZilliqaAccount.isOperator(proxy, userBase16Address, networkURL);

        // login role is set by context during wallet access
        if (loginRole === Role.OPERATOR.toString() && isOperator) {
            newRole = Role.OPERATOR.toString();
        } else {
            newRole = Role.DELEGATOR.toString();
        }
        setCurrRole(newRole);
    };

    // load initial data
    useEffect(() => {
        getAccountBalance();
        getNodeOptionsList();
        return () => {
            mountedRef.current = false;
        }
    }, [getAccountBalance, getNodeOptionsList]);

    // poll data
    useInterval(() => {
        getAccountBalance();
        getNodeOptionsList();
    }, mountedRef, refresh_rate_config);

    const networkChanger = (net: string) => {
        let networkLabel = "";
        let url = '';

        switch (net) {
            case NetworkLabel.MAINNET:
                // do nothing
                Alert("info", "You are on Mainnet.");
                networkLabel = NetworkLabel.MAINNET;
                url = NetworkURL.MAINNET;
                break;
            case NetworkLabel.TESTNET:
                networkLabel = NetworkLabel.TESTNET;
                url = NetworkURL.TESTNET;
                break;
            case NetworkLabel.ISOLATED_SERVER:
            case NetworkLabel.PRIVATE:
                if (environment_config === Environment.PROD) {
                    // warn users not to switch to testnet on production
                    Alert("warn", "Testnet is not supported. Please switch to Mainnet from ZilPay.");
                }
                break;
            default:
                break;
        }

        updateNetwork(networkLabel);
        setNetworkURL(url);
        ZilliqaAccount.changeNetwork(url);
        setProxy(networks_config[networkLabel].proxy);

        // update the current role since account has been switched
        updateCurrentRole(fromBech32Address(currWalletAddress).toLowerCase());
    }

    /**
     * When document has loaded, it start to observable network form zilpay.
     */
    useEffect(() => {
        if (accountType === AccessMethod.ZILPAY) {
            const zilPay = (window as any).zilPay;

            if (zilPay) {
                const accountStreamChanged = zilPay.wallet.observableAccount();
                const networkStreamChanged = zilPay.wallet.observableNetwork();

                // switch to the zilpay network on load
                networkChanger(zilPay.wallet.net);

                networkStreamChanged.subscribe((net: string) => networkChanger(net));
                
                accountStreamChanged.subscribe((account: any) => {
                    initParams(account.base16, AccessMethod.ZILPAY);
                    updateCurrentRole(account.base16.toLowerCase());
                    setCurrWalletAddress(toBech32Address(account.base16));
                });

                return () => {
                    accountStreamChanged.unsubscribe();
                    networkStreamChanged.unsubscribe();
                };
            }
        }
        // must only run once due to global listener
        // eslint-disable-next-line
    }, [setNetworkURL]);

    useEffect(() => {
        if (environment_config === Environment.DEV) {
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
    }, [network, networkURL]);


    // prevent user from refreshing
    useEffect(() => {
        window.onbeforeunload = (e: any) => {
            e.preventDefault();
            e.returnValue = 'The page auto retrieves data periodically. Please do not force refresh as you will lose your wallet connection.';
            setTimeout(() => {
                toast.dismiss();
            }, 5000);
            return (
                Alert("warn", "The app auto retrieves data periodically. Please do not force refresh as you will lose your wallet connection.")
            );
        }
    }, []);


    // eslint-disable-next-line
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
                        <button type="button" className="nav-link btn nav-btn" onClick={getAccountBalance}>Dashboard <span className="sr-only">(current)</span></button>
                    </li>
                </ul>
                <ul className="navbar-nav navbar-right">
                    <li className="nav-item">
                        <p className="px-1">{currWalletAddress ? <a href={getAddressLink(currWalletAddress, networkURL)} className="wallet-link" target="_blank" rel="noopener noreferrer">{currWalletAddress}</a> : 'No wallet detected'}</p>
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

                                {
                                    (currRole === Role.DELEGATOR.toString()) &&

                                    <>
                                    {/* delegator section */}
                                    <div className="p-4 mt-4 dashboard-card">
                                        <h5 className="card-title mb-4">Hi Delegator! What would you like to do today?</h5>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#delegate-stake-modal" data-keyboard="false" data-backdrop="static">Delegate Stake</button>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#redeleg-stake-modal" data-keyboard="false" data-backdrop="static">Transfer Stake</button>
                                        <button type="button" className="btn btn-contract-disabled mr-4" data-toggle="modal" data-keyboard="false" data-backdrop="static">Withdraw Stake (WIP)</button>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#withdraw-reward-modal" data-keyboard="false" data-backdrop="static">Claim Rewards</button>
                                        {/* <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#complete-withdrawal-modal" data-keyboard="false" data-backdrop="static">Complete Withdrawal</button> */}
                                    </div>
                                    </>
                                }

                                {
                                    (currRole === Role.OPERATOR.toString()) &&

                                    <>
                                    {/* node operator section */}

                                    <div className="p-4 mt-4 dashboard-card">
                                        <h5 className="card-title mb-4">Hi {nodeDetails.name ? nodeDetails.name : 'Operator'}! What would you like to do today?</h5>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#update-comm-rate-modal" data-keyboard="false" data-backdrop="static">Update Commission</button>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#update-recv-addr-modal" data-keyboard="false" data-backdrop="static">Update Receiving Address</button>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#withdraw-comm-modal" data-keyboard="false" data-backdrop="static">Withdraw Commission</button>
                                    </div>
                                    </>
                                }

                                {
                                    (currRole === Role.DELEGATOR.toString()) &&
                                    <>
                                    {/* delegator statistics */}

                                    <div id="delegator-stats-details" className="p-4 dashboard-card container-fluid">
                                        <div className="row">
                                            <div className="col">
                                                <h5 className="card-title mb-4">Overview</h5>
                                            </div> 
                                            <div className="col-12 text-center">
                                                <DelegatorStatsTable proxy={proxy} network={networkURL} refresh={refresh_rate_config} userAddress={currWalletAddress} />
                                            </div>
                                        </div>
                                    </div>
                                    </>
                                }

                                {
                                    (currRole === Role.DELEGATOR.toString()) &&
                                    <>
                                    {/* delegator portfolio */}

                                    <div id="staking-portfolio-details" className="p-4 dashboard-card container-fluid">
                                        <div className="row">
                                            <div className="col">
                                                <h5 className="card-title mb-4">My Staking Portfolio</h5>
                                            </div>
                                            <div className="col-12 text-center">
                                                { mountedRef.current && <StakingPortfolio proxy={proxy} network={networkURL} refresh={refresh_rate_config} userAddress={currWalletAddress} /> }
                                            </div>
                                        </div>
                                    </div>
                                    </>
                                }

                                {/* operator statistics */}
                                {
                                    (currRole === Role.OPERATOR.toString()) &&

                                   <div id="operator-stats-details" className="p-4 dashboard-card container-fluid">
                                        <div className="row">
                                            <div className="col">
                                                <h5 className="card-title mb-4">My Node Performance</h5>
                                            </div> 
                                            <div className="col-12 text-center">
                                                <OperatorStatsTable proxy={proxy} network={networkURL} refresh={refresh_rate_config} userAddress={currWalletAddress} setParentNodeDetails={setNodeDetails} />
                                            </div>
                                        </div>
                                    </div>
                                }

                                <div id="dashboard-ssn-details" className="p-4 dashboard-card container-fluid">
                                    <div className="row">
                                        <div className="col">
                                            <h5 className="card-title mb-4">Staked Seed Nodes</h5>
                                        </div>
                                        <div className="col-12 text-center">
                                            { mountedRef.current && <SsnTable proxy={proxy} network={networkURL} blockchainExplorer={blockchain_explorer_config} refresh={refresh_rate_config} currRole={currRole} /> }
                                        </div>
                                    </div>
                                </div>

                                <div id="dashboard-recent-txn" className="p-4 dashboard-card container-fluid">
                                    <div className="row">
                                        <div className="col">
                                            <h5 className="card-title mb-4">Recent Transactions</h5>
                                        </div>
                                        <div className="col-12 text-left">
                                            { recentTransactions.length === 0 && <p><em>No recent transactions.</em></p> }
                                            { recentTransactions.length !== 0 && mountedRef.current && <RecentTransactionsTable data={recentTransactions} network={networkURL} /> }
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                    <ToastContainer hideProgressBar={true}/>
                </div>
            </div>
            <footer id="disclaimer" className="align-items-start">
                <div className="p-2">
                <span className="mx-3">&copy; 2020 Zilliqa</span> 
                <button type="button" className="btn" data-toggle="modal" data-target="#disclaimer-modal" data-keyboard="false" data-backdrop="static">Disclaimer</button>
                </div>
            </footer>
            
            <DisclaimerModal />

            <UpdateCommRateModal 
                proxy={proxy} 
                networkURL={networkURL} 
                currentRate={nodeDetails.commRate} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} />

            <UpdateReceiverAddress 
                proxy={proxy} 
                networkURL={networkURL} 
                currentReceiver={nodeDetails.receiver} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} />

            <WithdrawCommModal 
                proxy={proxy} networkURL={networkURL} 
                currentRewards={nodeDetails.commReward} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} />

            <DelegateStakeModal 
                proxy={proxy} networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={nodeOptions} />

            <ReDelegateStakeModal 
                proxy={proxy} networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={nodeOptions} />

            <WithdrawStakeModal 
                proxy={proxy} 
                networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={nodeOptions} 
                userAddress={currWalletAddress} />

            <WithdrawRewardModal 
                proxy={proxy} 
                networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={nodeOptions} />

            <CompleteWithdrawModal 
                proxy={proxy} 
                networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} />
                
        </div>
        </>
    );
}

export default Dashboard;