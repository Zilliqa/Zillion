import React, { useContext, useEffect, useState } from 'react';
import { trackPromise } from 'react-promise-tracker';

import { AuthContext } from "../contexts/authContext";
import { Network, PromiseArea, Role } from '../util/enum';
import * as Account from "../account";
import SsnTable from './ssn-table';

import { BN, units } from '@zilliqa-js/util';
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';

import WithdrawCommModal from './contract-calls/withdraw-comm';
import UpdateReceiverAddress from './contract-calls/update-receiver-address';
import UpdateCommRateModal from './contract-calls/update-commission-rate';

import IconErrorWarning from './icons/error-warning';
import logo from "../static/logo.png";

const PROXY = process.env.REACT_APP_PROXY ? process.env.REACT_APP_PROXY : '';
const BLOCKCHAIN_NETWORK = process.env.REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK ? process.env.REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK : '';

function Dashboard(props: any) {

    const authContext = useContext(AuthContext);
    const { isAuthenticated, address, network, role } = authContext;
    const [balance, setBalance] = useState("");
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [error, setError] = useState('');
    const [isOperator, setIsOperator] = useState(false);

    const [nodeDetails, setNodeDetails] = useState({
        name: '',
        stakeAmt: '',
        bufferedDeposit: '',
        commRate: '',
        commReward: '',
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
            setBalance(zilBalance);
        }), PromiseArea.PROMISE_GET_BALANCE);
    }

    // when selected network is changed
    // useEffect is executed again
    useEffect(() => {
        console.log("dashboard use effect running");
        console.log("address: %o", address);
        console.log("role: %o", role);
        console.log("proxy: %o", PROXY);
        console.log("network :%o", BLOCKCHAIN_NETWORK);

        // check operator is indeed operator
        async function isOperator() {
            // convert user wallet address to base16
            // contract address is in base16
            let userAddressBase16 = fromBech32Address(address).toLowerCase();

            if (role === Role.OPERATOR) {
                console.log("check operator...");
                let isOperator = false;
                const contract = await Account.getSsnImplContract(PROXY, BLOCKCHAIN_NETWORK);
                if (contract === 'error') {
                    isOperator = false;
                }

                if (contract.ssnlist && contract.ssnlist.hasOwnProperty(userAddressBase16)) {
                    console.log("operator exist! :%o", address);
                    isOperator = true;
                    setIsOperator(true)
                } else {
                    isOperator = false;
                }
                if (!isOperator) {
                    console.error("wallet %o is not an operator!", address);
                    setIsOperator(false);
                }
            }
        }

        // isOperator();
        refreshStats();
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
                                <h1>Stake$ZIL Dashboard</h1>

                                <div id="dashboard-ssn-details" className="p-4 mb-4 bg-white rounded dashboard-card container-fluid">
                                    <div className="row">
                                        <div className="col">
                                            <h5 className="card-title mb-4">Staking Details</h5>
                                        </div>
                                        <div className="col-12 text-center"> 
                                            <SsnTable proxy={PROXY} network={selectedNetwork} refresh={process.env.REACT_APP_DATA_REFRESH_RATE} />
                                        </div>
                                    </div>
                                </div>

                                {
                                    isOperator &&

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

                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <UpdateCommRateModal proxy={PROXY} currentRate={nodeDetails.commRate}/>
            <UpdateReceiverAddress proxy={PROXY} currentReceiver={nodeDetails.receiver}/>
            <WithdrawCommModal proxy={PROXY} currentRewards={nodeDetails.commReward}/>
        </div>
        </>
    );
}

export default Dashboard;