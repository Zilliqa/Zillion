import React, { useContext, useEffect, useState, useMemo } from 'react';
import { useTable } from 'react-table';
import { AuthContext } from "../contexts/authContext";
import * as Account from "../account";
import logo from "../static/logo.png";
import { BN, units } from '@zilliqa-js/util';
import { Network } from '../util/enum';
import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import WithdrawCommModal from './contract-calls/withdraw-comm';
import UpdateReceiverAddress from './contract-calls/update-receiver-address';
import UpdateCommRateModal from './contract-calls/update-commission-rate';

import IconErrorWarning from './icons/error-warning';

function Table({ columns, data }: any) {
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = useTable({columns, data});
    
    return (
        <table id="staking-table" className="table" {...getTableProps()}>
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
                        <tr {...row.getRowProps()}>
                            {row.cells.map(cell => {
                                return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                            })}
                        </tr>
                    )
                })}
            </tbody>
        </table>
    );
}

function Dashboard(props: any) {

    const authContext = useContext(AuthContext);
    const { isAuthenticated, address, network } = authContext;
    const [balance, setBalance] = useState("");
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [error, setError] = useState('');
    const [proxyAddr, setProxyAddr] = useState('');
    const [data, setData] = useState([] as any);

    const [nodeDetails, setNodeDetails] = useState({
        name: '',
        stakeAmt: '',
        bufferedDeposit: '',
        commRate: '',
        commReward: '',
        receiver: ''
    });

    const columns = useMemo(
        () => [
            {
                Header: 'address',
                accessor: 'ssnAddress',
                className: 'ssn-address'
            },
            {
                Header: 'name',
                accessor: 'ssnName'
            },
            {
                Header: 'stake amount',
                accessor: 'ssnStakeAmt'
            },
            {
                Header: 'buffered deposit',
                accessor: 'ssnBufferedDeposit'
            },
            {
                Header: 'Comm. Rate',
                accessor: 'ssnCommRate'
            },
            {
                Header: 'Comm. Reward',
                accessor: 'ssnCommReward'
            },
            {
                Header: 'Delegators',
                accessor: 'ssnDeleg'
            }
        ],[]
    )

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

        let outputResult = [];

        // get ssn contract info for table generation
        if (implContract !== 'error') {
            for (const key in implContract.ssnlist) {
                if (implContract.ssnlist.hasOwnProperty(key) && key.startsWith("0x")) {
                    const ssnArgs = implContract.ssnlist[key].arguments;
                    const nodeJson = {
                        ssnAddress: toBech32Address(key),
                        ssnName: ssnArgs[3],
                        ssnStakeAmt: units.fromQa(new BN(ssnArgs[1]), units.Units.Zil),
                        ssnBufferedDeposit: units.fromQa(new BN(ssnArgs[6]), units.Units.Zil),
                        ssnCommRate: ssnArgs[7],
                        ssnCommReward: units.fromQa(new BN(ssnArgs[8]), units.Units.Zil),
                        ssnDeleg: 'WIP',
                    }
                    outputResult.push(nodeJson);
                }
            }
        }
        setData([...outputResult]);
        console.log("data: %o", data);
    }

    // when selected network is changed
    // useEffect is executed again
    useEffect(() => {
        console.log("dashboard use effect running");
        console.log("address: %o", address);
        refreshStats();
    }, [selectedNetwork, proxyAddr]);

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
                                <h1>StakeZ Dashboard</h1>
                                <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => refreshStats()}>Refresh</button>

                                <div className="p-4 my-4 bg-white rounded dashboard-card">
                                    <h5 className="card-title mb-4">Proxy Contract</h5>
                                    <input className="form-control" type="text" value={proxyAddr} onChange={handleProxyAddr} placeholder="Enter the proxy contract address" />
                                </div>

                                <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                    <h5 className="card-title mb-4">Staking Details</h5>
                                    { data.length > 0 ? <Table columns={columns} data={data}></Table> : <p><IconErrorWarning className="dashboard-icon" />No contract loaded.</p> }
                                </div>                                

                                {/* <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                    <h5 className="card-title mb-4">Node Statistics</h5>
                                    { error ? <p>There is an error retrieving the ssn contract</p> : (
                                        <>
                                            <p>Name: {nodeDetails.name}</p>
                                            <p>Stake amount: {nodeDetails.stakeAmt} ZIL</p>
                                            <p>Buffered deposit: {nodeDetails.bufferedDeposit} ZIL</p>
                                            <p>Commission rate: {nodeDetails.commRate} %</p>
                                            <p>Commission rewards: {nodeDetails.commReward} ZIL</p>
                                            <p>Receiver: {nodeDetails.receiver}</p>
                                        </>
                                    ) }
                                </div> */}

                                <div className="p-4 mb-4 bg-white rounded dashboard-card">
                                    <h5 className="card-title mb-4">What would you like to do today?</h5>
                                    <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-comm-rate-modal" data-keyboard="false" data-backdrop="static">Update Commission</button>
                                    <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#update-recv-addr-modal" data-keyboard="false" data-backdrop="static">Update Received Address</button>
                                    <button type="button" className="btn btn-primary mx-2" data-toggle="modal" data-target="#withdraw-comm-modal" data-keyboard="false" data-backdrop="static">Withdraw Commission</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <UpdateCommRateModal proxy={proxyAddr} currentRate={nodeDetails.commRate}/>
            <UpdateReceiverAddress proxy={proxyAddr} currentReceiver={nodeDetails.receiver}/>
            <WithdrawCommModal proxy={proxyAddr} currentRewards={nodeDetails.commReward}/>
        </div>
        </>
    );
}

export default Dashboard;