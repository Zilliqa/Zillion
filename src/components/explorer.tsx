import React, { useEffect, useRef, useState } from 'react';
import { trackPromise } from 'react-promise-tracker';
import DisclaimerModal from './disclaimer';
import Footer from './footer';

import * as ZilliqaAccount from '../account';
import { Environment, Network, PromiseArea, ContractState } from '../util/enum';
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
import IconSearch from './icons/search';
import ExplorerStakingPortfolio from './explorer-staking-portfolio';
import WarningBanner from './warning-banner';
import ExplorerPendingWithdrawalTable from './explorer-pending-withdrawal-table';



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
    const [explorerSearchAddress, setExplorerSearchAddress] = useState('');
    const [delegStats, setDelegStats] = useState<DelegStats>(initDelegStats);
    const [stakedNodeList, setStakedNodeList] = useState([] as DelegStakingPortfolioStats[]);

    const [pendingWithdrawalList, setPendingWithdrawlList] = useState([] as any);
    const [totalClaimableAmt, setTotalClaimableAmt] = useState('0');

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

        // for pending withdrawal progress
        let totalClaimableAmtBN = new BigNumber(0); // Qa
        let pendingStakeWithdrawalList: { amount: string, blkNumCountdown: string, blkNumCheck: string, progress: string }[] = [];
        let progress = '0';


        if (validation.isBech32(address)) {
            // bech32
            try {
                wallet = fromBech32Address(address).toLowerCase();
            } catch (err) {
                // input address maybe of bech32 format but cannot be decoded
                console.error("No such address: %o", address);
                wallet = '';
            }
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

                // compute pending withdrawal progress
                const withdrawalPendingState = await ZilliqaAccount.getImplStateExplorer(impl, networkURL, 'withdrawal_pending');

                if (withdrawalPendingState.hasOwnProperty('withdrawal_pending')) {
                    if (withdrawalPendingState['withdrawal_pending'].hasOwnProperty(wallet)) {
                        const blkNumPendingWithdrawal = withdrawalPendingState['withdrawal_pending'][wallet];

                        // get min bnum req
                        const blkNumReqState = await ZilliqaAccount.getImplStateExplorer(impl, networkURL, 'bnum_req');
                        const blkNumReq = blkNumReqState['bnum_req'];

                        const currentBlkNum = new BigNumber(await ZilliqaAccount.getNumTxBlocksExplorer(networkURL)).minus(1);

                        // compute each of the pending withdrawal progress
                        for (const blkNum in blkNumPendingWithdrawal) {
                            if (!blkNumPendingWithdrawal.hasOwnProperty(blkNum)) {
                                continue;
                            }

                            // compute each pending stake withdrawal progress
                            let pendingAmt = new BigNumber(blkNumPendingWithdrawal[blkNum]);
                            let blkNumCheck = new BigNumber(blkNum).plus(blkNumReq);
                            let blkNumCountdown = blkNumCheck.minus(currentBlkNum); // may be negative
                            let completed = new BigNumber(0);

                            // compute progress using blk num countdown ratio
                            if (blkNumCountdown.isLessThanOrEqualTo(0)) {
                                // can withdraw
                                totalClaimableAmtBN = totalClaimableAmtBN.plus(pendingAmt);
                                blkNumCountdown = new BigNumber(0);
                                completed = new BigNumber(1);
                            } else {
                                // still have pending blks
                                // 1 - (countdown/blk_req)
                                const processed = blkNumCountdown.dividedBy(blkNumReq);
                                completed = new BigNumber(1).minus(processed);
                            }

                            // convert progress to percentage
                            progress = completed.times(100).toFixed(2);

                            // record the stake withdrawal progress
                            pendingStakeWithdrawalList.push({
                                amount: pendingAmt.toString(),
                                blkNumCountdown: blkNumCountdown.toString(),
                                blkNumCheck: blkNumCheck.toString(),
                                progress: progress.toString(),
                            });
                        }
                    }
                }

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
                    setPendingWithdrawlList([...pendingStakeWithdrawalList]);
                    setTotalClaimableAmt(totalClaimableAmtBN.toString())
                    
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

    const handleExplorerSearchAddress = (e: any) => {
        setExplorerSearchAddress(e.target.value);
    }
    
    const explorerCheckRewards = () => {
        const zillionExplorerUrl = "/address/" + explorerSearchAddress
        props.history.push(zillionExplorerUrl);
    };


    return (
        <div className="cover explorer">
            <div className="container-fluid">
                <div className="row align-items-center">
                    <div className="cover-content col-12 text-center">

                        <WarningBanner />

                        <div 
                            id="explorer-mini-navbar" 
                            className={
                                ContractState.IS_PAUSED.toString() === "true" ? 
                                'explorer-mini-navbar-disabled d-flex align-items-end mr-4' : 
                                'explorer-mini-navbar-enabled d-flex align-items-end mr-4'}>

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
                            <h2 className="mb-0">Zillion Explorer</h2>
                      
                            <div className="d-flex justify-content-center h-100">
                                <div className="explorer-search mb-4">
                                    <input type="text" className="explorer-search-input" value={explorerSearchAddress} onChange={handleExplorerSearchAddress} placeholder="Enter wallet address to check rewards" maxLength={42}/>
                                    <button type="button" className="btn explorer-search-icon shadow-none" onClick={() => explorerCheckRewards()}><IconSearch width="18" height="18" /></button>
                                </div>
                            </div>
                           
                            <h6 className="explorer-wallet mt-4">{walletBase16Address && address}</h6>
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

                            <>
                            <div id="staking-portfolio-details" className="p-4 dashboard-card mb-4 container">
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

                            <ExplorerPendingWithdrawalTable
                                data={pendingWithdrawalList}
                                totalClaimableAmt={totalClaimableAmt} />
                            </>
                        }

                        <button type="button" className="btn btn-user-action-cancel mt-2 mx-2" onClick={redirectToMain}>Back to Main</button>

                    </div>
                    <Footer />
                    <DisclaimerModal />
                </div>
            </div>
        </div>
    );
}

export default Explorer;