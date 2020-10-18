import React, { useEffect, useRef, useState } from 'react';
import { trackPromise } from 'react-promise-tracker';
import DisclaimerModal from './disclaimer';
import Footer from './footer';

import * as ZilliqaAccount from '../account';
import { Environment, Network, PromiseArea } from '../util/enum';
import { DelegStats, DelegStakingPortfolioStats } from '../util/interface';

import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import { validation } from "@zilliqa-js/util";
import { computeDelegRewards } from '../util/reward-calculator';
import BN from 'bn.js';
import { convertQaToCommaStr, convertGzilToCommaStr } from '../util/utils';
import Spinner from './spinner';
import useDarkMode from '../util/use-dark-mode';

import ZillionLogo from '../static/zillion.svg';
import ZillionLightLogo from '../static/light/zillion.svg';
import IconSun from './icons/sun';
import IconMoon from './icons/moon';
import ExplorerStakingPortfolio from './explorer-staking-portfolio';


const BigNumber = require('bignumber.js');

const initDelegStats: DelegStats = {
    globalAPY: '0',
    zilRewards: '0',
    gzilRewards: '0',
    gzilBalance: '0',
    totalPendingWithdrawal: '0',
    totalDeposits: '0',
}

function Explorer(props: any) {
    const address = props.match.params.address; // bech32 wallet address;
    const [walletBase16Address, setWalletBase16Address] = useState('');
    const [delegStats, setDelegStats] = useState<DelegStats>(initDelegStats);
    const [stakedNodeList, setStakedNodeList] = useState([] as DelegStakingPortfolioStats[]);

    // config.js from public folder
    const { networks_config, environment_config } = (window as { [key: string]: any })['config'];
    const network = environment_config === Environment.PROD ? Network.MAINNET : Network.TESTNET;
    const networkURL = networks_config[network].blockchain;
    const impl = networks_config[network].impl;

    const mountedRef = useRef(true);

    // need this to set the correct theme
    // eslint-disable-next-line
    const darkMode = useDarkMode(true);

    
    useEffect(() => {
        let globalAPY = initDelegStats.globalAPY;
        let zilRewards = initDelegStats.zilRewards;
        let gzilRewards = initDelegStats.gzilRewards;
        let gzilBalance = initDelegStats.gzilBalance;
        let totalPendingWithdrawal = initDelegStats.totalPendingWithdrawal;
        let totalDeposits = initDelegStats.totalDeposits;
        let wallet = '';
        let stakedNodesList: DelegStakingPortfolioStats[] = [];

        if (validation.isBech32(address)) {
            // bech32
            wallet = fromBech32Address(address).toLowerCase();
        } else if (validation.isAddress(address)) {
            // base16
            wallet = address.toLowerCase();
        } else {
            // invalid address
            wallet = '';
        }

        if (mountedRef.current) {
            setWalletBase16Address(wallet);
        }

        trackPromise(ZilliqaAccount.getImplStateExplorer(impl, networkURL, 'deposit_amt_deleg')
            .then(async (contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }
    
                if (!contractState['deposit_amt_deleg'].hasOwnProperty(wallet)) {
                    return null;
                }

                let totalDepositsBN = new BigNumber(0);
                let totalZilRewardsBN = new BigNumber(0);
                const depositDelegList = contractState['deposit_amt_deleg'][wallet];

                // fetch ssnlist for the names
                // for computing list of staked nodes
                const ssnContractState = await ZilliqaAccount.getImplStateExplorer(impl, networkURL, 'ssnlist');

                if (!ssnContractState['ssnlist']) {
                    return null;
                }
                
                for (const ssnAddress in depositDelegList) {
                    if (!depositDelegList.hasOwnProperty(ssnAddress)) {
                        continue;
                    }

                    // compute total deposits
                    const delegAmtQaBN = new BigNumber(depositDelegList[ssnAddress]);
                    totalDepositsBN = totalDepositsBN.plus(delegAmtQaBN);

                    // compute zil rewards
                    const delegRewards = new BN(await computeDelegRewards(impl, networkURL, ssnAddress, wallet)).toString();
                    totalZilRewardsBN = totalZilRewardsBN.plus(new BigNumber(delegRewards));

                    // append data to list of staked nodes
                    const data: DelegStakingPortfolioStats = {
                        ssnName: ssnContractState['ssnlist'][ssnAddress]['arguments'][3],
                        ssnAddress: toBech32Address(ssnAddress),
                        delegAmt: delegAmtQaBN.toString(),
                        rewards: delegRewards.toString()
                    }
                    stakedNodesList.push(data);
                }

                totalDeposits = totalDepositsBN.toString();
                zilRewards = totalZilRewardsBN.toString();

                // compute gzil rewards
                // converted to gzil when display
                gzilRewards = totalZilRewardsBN;

            })
            .catch((err) => {
                console.error(err);
                return null;
            })
            .finally(() => {
                if (mountedRef.current) {
                    const data : DelegStats = {
                        globalAPY: globalAPY, // not use
                        zilRewards: zilRewards,
                        gzilRewards: gzilRewards,
                        gzilBalance: gzilBalance, // not use
                        totalPendingWithdrawal: totalPendingWithdrawal, // not use
                        totalDeposits: totalDeposits,
                    }
                    setDelegStats(data);
                    setStakedNodeList([...stakedNodesList]);
                }
            }), PromiseArea.PROMISE_GET_EXPLORER_STATS);

    }, [impl, networkURL, address]);


    const redirectToMain = () => {
        props.history.push("/");
    };

    const toggleTheme = () => {
        if (darkMode.value === true) {
          darkMode.disable();
        } else {
          darkMode.enable();
        }
    };

    const toggleZillionLogo = () => {
        if (darkMode.value === true) {
          return <img src={ZillionLogo} alt="zillion" width="480px" className="mt-2 mb-4 zillion-logo" />;
        } else {
          return <img src={ZillionLightLogo} alt="zillion" width="480px" className="mt-2 mb-4 zillion-logo" />;
        }
    };


    return (
        <div className="cover explorer">
            <div className="container-fluid">
                <div className="row align-items-center">
                    <div className="cover-content col-12 text-center">

                    <div id="explorer-mini-navbar" className="d-flex align-items-end mr-4">

                    <div>
                        <button type="button" className="btn btn-theme shadow-none mr-3" onClick={toggleTheme}>
                        { 
                            darkMode.value === true ? 
                            <IconSun width="20" height="20"/> : 
                            <IconMoon width="20" height="20"/>
                        }
                        </button>
                    </div>

                    { 
                        ( environment_config === Environment.STAGE || environment_config === Environment.PROD ) && 
                        <span className="mr-2">{network}</span>
                    }

                    </div>

                        <div className="heading">
                            <>{toggleZillionLogo()}</>
                            <p className="tagline">Staking with Zilliqa. Simplified!</p>
                        </div>

                        <div className="wallet-access">
                            <h2>Zillion Explorer</h2>
                            <h6 className="explorer-wallet">{walletBase16Address && address}</h6>
                        </div>
                        
                        { !walletBase16Address && <p className="mb-4">No such address.</p> }

                        {/* delegator rewards */}
                        {
                            walletBase16Address &&

                            <div id="delegator-stats-details" className="p-4 dashboard-card container">
                                <div className="row">
                                    <div className="col text-left">
                                        <h5 className="card-title mb-4">Overview</h5>
                                    </div>
                                    <div className="col-12 text-center">
                                        <Spinner class="spinner-border dashboard-spinner mb-4" area={PromiseArea.PROMISE_GET_EXPLORER_STATS} />
                                        <div className="row px-2 pb-3 align-items-center justify-content-center">
                                            <div className="d-block deleg-stats-card">
                                                <h3>Total Deposits</h3>
                                                <span>{convertQaToCommaStr(delegStats.totalDeposits)}</span>
                                            </div>
                                            <div className="d-block deleg-stats-card">
                                                <h3>Unclaimed ZIL Rewards</h3>
                                                <span>{convertQaToCommaStr(delegStats.zilRewards)}</span>
                                            </div>
                                            <div className="d-block deleg-stats-card">
                                                <h3>Unclaimed GZIL Rewards</h3>
                                                <span>{convertGzilToCommaStr(delegStats.gzilRewards)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }

                        {/* each ssn staked */}

                        {
                            walletBase16Address &&

                            <div id="staking-portfolio-details" className="p-4 dashboard-card container">
                                <div className="row">
                                    <div className="col">
                                        <h5 className="card-title mb-4 text-left">Nodes Staked</h5>
                                    </div>
                                    <div className="col-12">
                                        <ExplorerStakingPortfolio 
                                            network={networkURL} 
                                            data={stakedNodeList} />
                                    </div>
                                </div>
                            </div>
                        }

                        <button type="button" className="btn btn-user-action-cancel mx-2" onClick={redirectToMain}>Back to Main</button>

                    </div>
                    <Footer />
                    <DisclaimerModal />
                </div>
            </div>
        </div>
    );
}

export default Explorer;