import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from "../contexts/authContext";
import * as Account from "../account";
import logo from "../static/logo.png";
import { BN, units } from '@zilliqa-js/util';
import { Network } from '../util/enum';
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import WithdrawCommModal from './contract-calls/withdraw-comm';
import UpdateReceiverAddress from './contract-calls/update-receiver-address';

function Dashboard(props: any) {

    const authContext = useContext(AuthContext);
    const { isAuthenticated, address, network } = authContext;
    const [balance, setBalance] = useState("");
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [error, setError] = useState('');
    const [proxyAddr, setProxyAddr] = useState('');

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

    const handleProxyAddr = (e: any) => {
        setProxyAddr(e.target.value);
    }

    const refreshStats = async () => {
        setError('');

        // get account balance
        const balance = await Account.getBalance(address);
        const zilBalance = units.fromQa(new BN(balance), units.Units.Zil);
        setBalance(zilBalance);

        // get ssn contract info
        const implContract = await Account.getSsnImplContract(proxyAddr);
        if (implContract === 'error') {
            handleError();
        } else {
            const userBase16Addr = fromBech32Address(address).toLowerCase();
            console.log("user base 16 addrress: %o", userBase16Addr);
            if (userBase16Addr in implContract.ssnlist) {
                const ssnArgs = implContract.ssnlist[userBase16Addr].arguments;
                setNodeDetails({
                    name: ssnArgs[3],
                    stakeAmt: units.fromQa(new BN(ssnArgs[1]), units.Units.Zil),
                    bufferedDeposit: units.fromQa(new BN(ssnArgs[6]), units.Units.Zil),
                    commRate: ssnArgs[7],
                    commReward: units.fromQa(new BN(ssnArgs[8]), units.Units.Zil),
                    receiver: toBech32Address(ssnArgs[9])
                });
            } else {
                handleError();
            }
        }
    }

    const updateRecvAddress = async () => {
        const result = await Account.updateReceiverAddress(proxyAddr, "zil1dcyphrx2grzct4kkn7ty87h354zaz0trvnkuuj");
        console.log(result);
    };

    const withdrawComm = async () => {
        const result = await Account.withdrawComm(proxyAddr);
        console.log(result);
    }

    // when selected network is changed
    // useEffect is executed again
    useEffect(() => {
        console.log("dashboard use effect running");
        console.log("address: %o", address);
        refreshStats();
    }, [selectedNetwork, proxyAddr]);

    return (
        <div id="dashboard" className="container-fluid h-100">
            <div className="row h-100">
                <div id="sidebar" className="col-md-2">
                    <div className="mt-4 pb-4">
                        <a href="/dashboard"><img className="logo mx-auto d-block" src={logo} alt="zilliqa_logo" /></a>
                        <h1 className="mt-4">Zilliqa Staking</h1>
                    </div>
                    <hr className="sidebar-divider"/>
                    <div id="navigation">
                        <ul>
                            <li><a href="/#">Staking</a></li>
                            <li><a href="/#">Transactions</a></li>
                            <li><a href="/#">FAQ</a></li>
                        </ul>
                    </div>
                </div>
                <div id="content" className="col-md-9 col-lg-10 px-4 pt-4">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-12">
                                <h1>StakeZ Dashboard</h1>
                                <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => refreshStats()}>Refresh</button>
                                <div className="my-4 p-4 bg-white rounded dashboard-card">
                                    <h5 className="card-title mb-4">Account</h5>
                                    <div className="form-group">
                                        <label htmlFor="network">Network</label>
                                        <select id="network" value={selectedNetwork} onChange={handleChangeNetwork} className="form-control">
                                            <option value={Network.TESTNET}>Testnet ({Network.TESTNET})</option>
                                            <option value={Network.MAINNET}>Mainnet ({Network.MAINNET})</option>
                                            <option value={Network.ISOLATED_SERVER}>Isolated Server ({Network.ISOLATED_SERVER})</option>
                                        </select>
                                    </div>
                                    <p>Address: {address}</p>
                                    <p>Balance: {balance} ZIL</p>
                                </div>

                                <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                    <h5 className="card-title mb-4">Proxy Contract</h5>
                                    <input className="form-control" type="text" value={proxyAddr} onChange={handleProxyAddr} placeholder="Enter the proxy contract address" />
                                </div>

                                <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                    <h5 className="card-title mb-4">Node Statistics</h5>
                                    { error ? <p>There is an error retrieving the ssn contract</p> : (
                                        <>
                                            <p>Name: {nodeDetails.name}</p>
                                            <p>Stake amount: {nodeDetails.stakeAmt} ZIL</p>
                                            <p>Buffered deposit: {nodeDetails.bufferedDeposit} ZIL</p>
                                            <p>Commission rate: {nodeDetails.commRate} %</p>
                                            <p>Commission rewards: {nodeDetails.commReward} ZIL</p>
                                            <p>Receiver: {nodeDetails.receiver} </p>
                                        </>
                                    ) }
                                </div>

                                <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                    <h5 className="card-title mb-4">Node Operator Actions</h5>
                                    <button type="button" className="btn btn-primary mx-2">Update Commission</button>
                                    <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-recv-addr-modal">Update Received Address</button>
                                    <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-comm-modal">Withdraw Commission</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <UpdateReceiverAddress proxy={proxyAddr}/>
            <WithdrawCommModal proxy={proxyAddr}/>
        </div>
    );
}

export default Dashboard;