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
import CompleteWithdrawalTable from './complete-withdrawal-table';
import IconQuestionCircle from './icons/question-circle';
import ReactTooltip from 'react-tooltip';
import { computeDelegRewards } from '../util/reward-calculator';
import BN from 'bn.js';


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
    const [impl, setImpl] = useState(networks_config[network].impl)

    const [networkURL, setNetworkURL] = useState(networks_config[network].blockchain);

    const mountedRef = useRef(true);

    const [minDelegStake, setMinDelegStake] = useState('');

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
    const [withdrawStakeOptions, setWithdrawStakeOptions] = useState([] as NodeOptions[]);
    const [claimedRewardsOptions, setClaimedRewardsOptions] = useState([] as NodeOptions[]);

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
        setImpl(networks_config[networkLabel].impl);
    }, [updateNetwork, networks_config]);


    const getAccountBalance = useCallback(() => {
        let currBalance = '0';

        trackPromise(ZilliqaAccount.getBalance(currWalletAddress)
            .then((balance) => {
                currBalance = balance;
            })
            .finally(() => {
                if (mountedRef.current) {
                    setBalance(currBalance);
                }

            }), PromiseArea.PROMISE_GET_BALANCE);
    }, [currWalletAddress]);


    // retrieve contract constants such as min stake
    // passed to children components
    const getContractConstants = useCallback(() => {
        let minDelegStake = '0';

        ZilliqaAccount.getImplState(impl, "mindelegstake")
            .then((contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }
                minDelegStake = contractState.mindelegstake;
            })
            .finally(() => {
                if (!mountedRef.current) {
                    return null;
                }
                setMinDelegStake(minDelegStake);
            });
    }, [impl])


    // generate options list
    // fetch node operator names and address 
    // for the dropdowns in the modals
    const getNodeOptionsList = useCallback(() => {
        let tempNodeOptions: NodeOptions[] = [];
        let withdrawStakeOptions: NodeOptions[] = [];
        let claimRewardsOptions: NodeOptions[] = [];

        ZilliqaAccount.getImplState(impl, "ssnlist")
            .then((contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }

                for (const operatorAddr in contractState.ssnlist) {
                    if (!contractState.ssnlist.hasOwnProperty(operatorAddr)) {
                        continue;
                    }

                    const operatorName = contractState.ssnlist[operatorAddr].arguments[3];
                    const operatorBech32Addr = toBech32Address(operatorAddr);
                    const operatorOption: NodeOptions = {
                        label: operatorName + ": " + operatorBech32Addr,
                        value: operatorAddr
                    }
                    tempNodeOptions.push(operatorOption);
                }
            })
            .finally(() => {
                if (!mountedRef.current) {
                    return null;
                }
                setNodeOptions([...tempNodeOptions]);
            });

        // get withdraw stake options
        ZilliqaAccount.getImplState(impl, "deposit_amt_deleg")
            .then(async (contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }

                const userBase16Address = fromBech32Address(currWalletAddress).toLowerCase();
                const depositDelegList = contractState.deposit_amt_deleg[userBase16Address];
                console.log(tempNodeOptions);

                for (const item of tempNodeOptions) {
                    const ssnAddress = item.value;
                    if (ssnAddress in depositDelegList) {
                        // include the stake amount in the labels
                        const delegAmt = depositDelegList[ssnAddress];

                        // include the claimed rewards in the labels
                        const delegRewards = new BN(await computeDelegRewards(impl, networkURL, ssnAddress, userBase16Address)).toString();
                        

                        withdrawStakeOptions.push({
                            label: item.label + " (" + convertQaToCommaStr(delegAmt) + " ZIL)",
                            value: item.value
                        });

                        if (delegRewards && delegRewards !== '0') {
                            claimRewardsOptions.push({
                                label: item.label + " (" + convertQaToCommaStr(delegRewards) + " ZIL)",
                                value: item.value
                            });
                        }
                    }
                }
            })
            .finally(() => {
                if (!mountedRef.current) {
                    return null;
                }
                setWithdrawStakeOptions([...withdrawStakeOptions]);
                setClaimedRewardsOptions([...claimRewardsOptions]);
            });

    }, [impl, currWalletAddress, networkURL]);

    const updateRecentTransactions = (txnId: string) => {
        setRecentTransactions([...recentTransactions.reverse(), {txnId: txnId}].reverse());
    }

    // update current role is used for ZilPay
    // due to account switch on the fly
    // role is always compared against the selected role at home page
    const updateCurrentRole = useCallback(async (userBase16Address: string, currImpl?: string, currNetworkURL?: string) => {
        // setState is async
        // use input params to get latest impl and network
        let newRole = "";
        let implAddress = currImpl ? currImpl : impl;
        let networkAddress = currNetworkURL ? currNetworkURL : networkURL;

        console.log("updating current role...%o", userBase16Address);

        const isOperator = await ZilliqaAccount.isOperator(implAddress, userBase16Address, networkAddress);

        // login role is set by context during wallet access
        if (loginRole === Role.OPERATOR.toString() && isOperator) {
            newRole = Role.OPERATOR.toString();
        } else {
            newRole = Role.DELEGATOR.toString();
        }
        setCurrRole(newRole);
    }, [impl, networkURL, loginRole]);

    // load initial data
    useEffect(() => {
        getAccountBalance();
        getNodeOptionsList();
        getContractConstants();
        return () => {
            mountedRef.current = false;
        }
    }, [getAccountBalance, getNodeOptionsList, getContractConstants]);

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
        setProxy(networks_config[networkLabel].proxy);
        setImpl(networks_config[networkLabel].impl);
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
    }, []);

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


    // change to correct network for account.ts
    // change to correct role for zilpay switch
    // this is equilvant to a setState callback for setCurrWalletAddress, setNetworkURL
    // because setState is async - have to execute these functions from useEffect
    // when wallet address change (zilpay switch account)
    // when network change (zilpay switch network)
    useEffect(() => {
        console.log("unified change network");
        ZilliqaAccount.changeNetwork(networkURL);
        updateCurrentRole(fromBech32Address(currWalletAddress).toLowerCase());
    }, [currWalletAddress, networkURL, updateCurrentRole]);

    
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
                                        <button type="button" className="btn btn-contract ml-2 mr-4" data-toggle="modal" data-target="#delegate-stake-modal" data-keyboard="false" data-backdrop="static">Delegate Stake</button>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#redeleg-stake-modal" data-keyboard="false" data-backdrop="static">Transfer Stake</button>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#withdraw-stake-modal" data-keyboard="false" data-backdrop="static">Initiate Stake Withdrawal</button>
                                        <button type="button" className="btn btn-contract mr-4" data-toggle="modal" data-target="#withdraw-reward-modal" data-keyboard="false" data-backdrop="static">Claim Rewards</button>
                                        
                                        {/* complete withdrawal */}
                                        <div id="delegator-complete-withdraw-details" className="col-12 mt-4 px-1 py-3 text-center">
                                            <CompleteWithdrawalTable impl={impl} network={networkURL} refresh={refresh_rate_config} userAddress={currWalletAddress} />
                                        </div>
                                        <ReactTooltip id="withdraw-question" place="bottom" type="dark" effect="solid">
                                            <span>When you initiate a stake withdrawal, the amount is not withdrawn immediately.</span>
                                            <br/>
                                            <span>The amount is processed at a certain block number and only available to withdraw<br/>once the required block number is reached.</span>
                                        </ReactTooltip>
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
                                                <DelegatorStatsTable impl={impl} network={networkURL} refresh={refresh_rate_config} userAddress={currWalletAddress} />
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
                                            <div className="col-12 mt-2 px-4 text-center">
                                                <div className="inner-section">
                                                    <h6 className="inner-section-heading px-4 pt-4 pb-3" >Deposits <span data-tip data-for="deposit-question"><IconQuestionCircle width="16" height="16" className="section-icon" /></span></h6>
                                                    { mountedRef.current && <StakingPortfolio impl={impl} network={networkURL} refresh={refresh_rate_config} userAddress={currWalletAddress} /> }
                                                </div>
                                            </div>
                                            <ReactTooltip id="deposit-question" place="bottom" type="dark" effect="solid">
                                                <span>This shows you the list of nodes which you have staked your deposit in.</span>
                                            </ReactTooltip>
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
                                                <OperatorStatsTable impl={impl} network={networkURL} refresh={refresh_rate_config} userAddress={currWalletAddress} setParentNodeDetails={setNodeDetails} />
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
                                            { mountedRef.current && <SsnTable impl={impl} network={networkURL} blockchainExplorer={blockchain_explorer_config} refresh={refresh_rate_config} currRole={currRole} /> }
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

                                <div className="px-2">
                                    <ToastContainer hideProgressBar={true}/>
                                </div>

                            </div>
                        </div>
                    </div>
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
                impl={impl} 
                networkURL={networkURL} 
                currentRate={nodeDetails.commRate} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} />

            <UpdateReceiverAddress 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                currentReceiver={nodeDetails.receiver} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} />

            <WithdrawCommModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                currentRewards={nodeDetails.commReward} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} />

            <DelegateStakeModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={nodeOptions}
                minDelegStake={minDelegStake} />

            <ReDelegateStakeModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={nodeOptions} />

            <WithdrawStakeModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={withdrawStakeOptions} 
                userAddress={currWalletAddress} />

            <WithdrawRewardModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={claimedRewardsOptions}
                userAddress={currWalletAddress} />

            <CompleteWithdrawModal 
                proxy={proxy}
                impl={impl}  
                networkURL={networkURL} 
                onSuccessCallback={updateRecentTransactions} 
                ledgerIndex={ledgerIndex} />
                
        </div>
        </>
    );
}

export default Dashboard;