import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from "../contexts/authContext";
import * as Account from "../account";
import logo from "../static/logo.png";
import { BN, units } from '@zilliqa-js/util';

function Dashboard(props: any) {

    const authContext = useContext(AuthContext);
    const { isAuthenticated, address, network } = authContext;
    const [balance, setBalance] = useState("");

    useEffect(() => {
        console.log("dashboard use effect running");
        console.log("address: %o", address);
        (async () => {
            const balance = await Account.getBalance(address);
            const zilBalance = units.fromQa(new BN(balance), units.Units.Zil);
            setBalance(zilBalance);
        })();
    }, [address]);

    return (
        <div id="dashboard" className="container-fluid h-100">
            <div className="row h-100">
                <div id="sidebar" className="col-md-2">
                    <div className="mt-4 pb-4">
                        <img className="logo mx-auto d-block" src={logo} alt="zilliqa_logo" />
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
                <div id="content" className="col-md-9 col-lg-10 px-4 pt-4 bg-light">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-12">
                                <h1>StakeZ Dashboard</h1>
                                <div className="my-4 p-4 bg-white rounded">
                                    <h5 className="card-title">Account</h5>
                                    <p>Network: {network}</p>
                                    <p>Address: {address}</p>
                                    <p>Balance: {balance} ZIL</p>
                                </div>
                                <div className="p-4 bg-white rounded">
                                    <h5 className="card-title">Actions</h5>
                                    <button type="button" className="btn btn-primary mx-2">Delegate Stake</button>
                                    <button type="button" className="btn btn-primary mx-2">Withdraw Commission</button>
                                    <button type="button" className="btn btn-primary mx-2">Withdraw Stake</button>
                                    <button type="button" className="btn btn-primary mx-2">Withdraw Stake Rewards</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;