import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { trackPromise } from 'react-promise-tracker';
import ReactTooltip from 'react-tooltip';

import AppContext from "../contexts/appContext";
import { PromiseArea, Role, NetworkURL, Network as NetworkLabel, AccessMethod, Environment, SsnStatus, Constants, TransactionType, ButtonText, ContractState, OperationStatus } from '../util/enum';
import { convertQaToCommaStr, getAddressLink, convertZilToQa, convertNetworkUrlToLabel, calculateBlockRewardCountdown } from '../util/utils';
import * as ZilliqaAccount from "../account";
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
import CompleteWithdrawalTable from './complete-withdrawal-table';

import IconQuestionCircle from './icons/question-circle';
import IconRefresh from './icons/refresh';
import IconBell from './icons/bell';
import IconCheckboxBlankCircle from './icons/checkbox-blank-circle';
import IconSun from './icons/sun';
import IconMoon from './icons/moon';

import useDarkMode from '../util/use-dark-mode';
import { useInterval } from '../util/use-interval';
import { computeDelegRewards } from '../util/reward-calculator';
import { DelegStats, DelegStakingPortfolioStats, NodeOptions, OperatorStats, SsnStats, ClaimedRewardModalData, WithdrawStakeModalData, TransferStakeModalData, DelegateStakeModalData } from '../util/interface';
import { getLocalItem, storeLocalItem } from '../util/use-local-storage';

import Footer from './footer';
import RecentTxnDropdown from './recent-txn';
import Tippy from '@tippyjs/react';
import '../tippy.css';
import 'tippy.js/animations/shift-away-subtle.css';


import BN from 'bn.js';
import WarningDashboardBanner from './warning-dashboard-banner';


const BigNumber = require('bignumber.js');
const TOTAL_REWARD_SEED_NODES = Constants.TOTAL_REWARD_SEED_NODES.toString();


const initDelegStats: DelegStats = {
    globalAPY: '0',
    zilRewards: '0',
    gzilRewards: '0',
    gzilBalance: '0',
    totalDeposits: '0',
}

const initOperatorStats: OperatorStats = {
    name: '',
    stakeAmt: '0',
    bufferedDeposits: '0',
    commRate: '0',
    commReward: '0',
    delegNum: '0',
    receiver: '0',
}

const initClaimedRewardModalData: ClaimedRewardModalData = {
    ssnName: '',
    ssnAddress: '',
    rewards: '0'
}

const initDelegStakeModalData: DelegateStakeModalData = {
    ssnName: '',
    ssnAddress: '',
    commRate: '0'
}

const initTransferStakeModalData: TransferStakeModalData = {
    ssnName: '',
    ssnAddress: '',
    delegAmt: '0'
}

const initWithdrawStakeModalData: WithdrawStakeModalData = {
    ssnName: '',
    ssnAddress: '',
    delegAmt: '0'
}



function Dashboard(props: any) {

    const appContext = useContext(AppContext);
    const { accountType, address, isAuth, loginRole, ledgerIndex, network, initParams, updateNetwork } = appContext;


    const [currWalletAddress, setCurrWalletAddress] = useState(address ? address : ''); // keep track of current wallet as zilpay have multiple wallets
    const [currRole, setCurrRole] = useState(loginRole);

    const [balance, setBalance] = useState("");

    // config.js from public folder
    const { blockchain_explorer_config, networks_config, refresh_rate_config, environment_config } = (window as { [key: string]: any })['config'];
    const [proxy, setProxy] = useState(networks_config[network].proxy);
    const [impl, setImpl] = useState(networks_config[network].impl)

    const [networkURL, setNetworkURL] = useState(networks_config[network].blockchain);

    const mountedRef = useRef(true);

    const [minDelegStake, setMinDelegStake] = useState('0');
    const [totalStakeAmt, setTotalStakeAmt] = useState('0');
    const [totalClaimableAmt, setTotalClaimableAmt] = useState('0');

    // data for each panel section
    const [delegStats, setDelegStats] = useState<DelegStats>(initDelegStats);
    const [delegStakingStats, setDelegStakingStats] = useState([] as DelegStakingPortfolioStats[]);
    const [delegPendingStakeWithdrawalStats, setDelegPendingStakeWithdrawalStats] = useState([] as any);
    const [totalPendingWithdrawalAmt, setTotalPendingWithdrawalAmt] = useState('0');
    const [operatorStats, setOperatorStats] = useState<OperatorStats>(initOperatorStats);
    const [ssnStats, setSsnStats] = useState([] as SsnStats[]);

    // block countdown to reward distribution
    const [blockCountToReward, setBlockCountToReward] = useState('0');

    const [nodeOptions, setNodeOptions] = useState([] as NodeOptions[]);
    
    // data for each contract modal
    const [claimedRewardsModalData, setClaimedRewardModalData] = useState<ClaimedRewardModalData>(initClaimedRewardModalData);
    const [delegStakeModalData, setDelegStakeModalData] = useState<DelegateStakeModalData>(initDelegStakeModalData);
    const [transferStakeModalData, setTransferStakeModalData] = useState<TransferStakeModalData>(initTransferStakeModalData);
    const [withdrawStakeModalData, setWithdrawStakeModalData] = useState<WithdrawStakeModalData>(initWithdrawStakeModalData);

    const [isRefreshDisabled, setIsRefreshDisabled] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isTxnNotify, setIsTxnNotify] = useState(false);
    const [ariaExpanded, setAriaExpanded] = useState(false);

    const [recentTransactions, setRecentTransactions] = useState([] as any)

    const darkMode = useDarkMode(true);

    const cleanUp = () => {
        ZilliqaAccount.cleanUp();
        appContext.cleanUp();
        console.log("directing to dashboard");
        props.history.push("/");
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

    // set recent txn indicator icon
    const handleTxnNotify = () => {
        if (!isTxnNotify) {
            return;
        }
        setIsTxnNotify(false);
    }

    const getAccountBalance = useCallback(() => {
        let currBalance = '0';

        trackPromise(ZilliqaAccount.getBalance(currWalletAddress)
            .then((balance) => {
                currBalance = balance;
            })
            .catch((err) => {
                console.error(err);
                if (mountedRef.current) {
                    setIsError(true);
                }
                return null;
            })
            .finally(() => {
                if (mountedRef.current) {
                    console.log("updating wallet balance...");
                    setBalance(currBalance);
                }

            }), PromiseArea.PROMISE_GET_BALANCE);
    }, [currWalletAddress]);


    // retrieve contract constants such as min stake
    // passed to children components
    const getContractConstants = useCallback(async () => {
        let minDelegStake = '0';
        let totalStakeAmt = '0';

        ZilliqaAccount.getImplState(impl, "mindelegstake")
            .then((contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }
                minDelegStake = contractState.mindelegstake;
            })
            .catch((err) => {
                console.error(err);
                if (mountedRef.current) {
                    setIsError(true);
                }
                return null;
            })
            .finally(() => {
                if (!mountedRef.current) {
                    return null;
                }
                setMinDelegStake(minDelegStake);
            });
        
        ZilliqaAccount.getImplState(impl, 'totalstakeamount')
            .then((contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }
                totalStakeAmt = contractState.totalstakeamount;
            })
            .catch((err) => {
                console.error(err);
                if (mountedRef.current) {
                    setIsError(true);
                }
                return null;
            })
            .finally(() => {
                if (mountedRef.current) {
                    setTotalStakeAmt(totalStakeAmt);
                }
            });

    }, [impl]);


    /* fetch data for delegator stats panel */
    const getDelegatorStats = useCallback(() => {
        let globalAPY = initDelegStats.globalAPY;
        let zilRewards = initDelegStats.zilRewards;
        let gzilRewards = initDelegStats.gzilRewards;
        let gzilBalance = initDelegStats.gzilBalance;
        let totalDeposits = initDelegStats.totalDeposits;
        
        const userBase16Address = fromBech32Address(currWalletAddress).toLowerCase();

        trackPromise(ZilliqaAccount.getImplState(impl, 'deposit_amt_deleg')
        .then(async (contractState) => {
            if (contractState === undefined || contractState === 'error') {
                return null;
            }

            if (!contractState['deposit_amt_deleg'].hasOwnProperty(userBase16Address)) {
                return null;
            }

            // compute global APY
            const totalStakeAmtState = await ZilliqaAccount.getImplState(impl, 'totalstakeamount');
            if (totalStakeAmtState['totalstakeamount']) {
                let temp = new BigNumber(totalStakeAmtState['totalstakeamount']);
                if (!temp.isEqualTo(0)) {
                    globalAPY = new BigNumber(convertZilToQa(TOTAL_REWARD_SEED_NODES)).dividedBy(temp).times(36500).toFixed(2).toString();
                }
            }

            let totalDepositsBN = new BigNumber(0);
            let totalZilRewardsBN = new BigNumber(0);
            const depositDelegList = contractState['deposit_amt_deleg'][userBase16Address];

            for (const ssnAddress in depositDelegList) {
                if (!depositDelegList.hasOwnProperty(ssnAddress)) {
                    continue;
                }

                // compute total deposits
                const delegAmtQaBN = new BigNumber(depositDelegList[ssnAddress]);
                totalDepositsBN = totalDepositsBN.plus(delegAmtQaBN);

                // compute zil rewards
                const delegRewards = new BN(await computeDelegRewards(impl, networkURL, ssnAddress, userBase16Address)).toString();
                totalZilRewardsBN = totalZilRewardsBN.plus(new BigNumber(delegRewards));
            }

            totalDeposits = totalDepositsBN.toString();
            zilRewards = totalZilRewardsBN.toString();

            // compute gzil rewards
            // converted to gzil when display
            gzilRewards = totalZilRewardsBN;

            // get gzil balance
            const gzilAddressState = await ZilliqaAccount.getImplState(impl, 'gziladdr');
            if (gzilAddressState.gziladdr) {
                const gzilContractState = await ZilliqaAccount.getGzilContract(gzilAddressState['gziladdr']);
                if (gzilContractState.balances) {
                    const gzilBalanceMap = gzilContractState.balances;
                    if (gzilBalanceMap.hasOwnProperty(userBase16Address)) {
                        // compute user gzil balance
                        gzilBalance = gzilBalanceMap[userBase16Address];
                    }
                }
            }

        })
        .catch((err) => {
            console.error(err);
            if (mountedRef.current) {
                setIsError(true);
            }
            return null;
        })
        .finally(() => {
            if (mountedRef.current) {
                console.log("updating delegator stats...");

                const data: DelegStats = {
                    globalAPY: globalAPY,
                    zilRewards: zilRewards,
                    gzilRewards: gzilRewards,
                    gzilBalance: gzilBalance,
                    totalDeposits: totalDeposits,
                }

                setDelegStats(data);
            }
        }), PromiseArea.PROMISE_GET_DELEG_STATS);

    }, [impl, currWalletAddress, networkURL]);


    /* fetch data for delegator pending stake withdrawal */
    const getDelegatorPendingWithdrawal = useCallback(() => {
        let totalClaimableAmtBN = new BigNumber(0); // Qa
        let totalPendingAmtBN = new BigNumber(0); // Qa, for deleg stats panel
        let pendingStakeWithdrawalList: { amount: string, blkNumCountdown: string, blkNumCheck: string, progress: string }[] = [];
        let progress = '0';
        
        const wallet = fromBech32Address(currWalletAddress).toLowerCase();

        trackPromise(ZilliqaAccount.getImplStateExplorer(impl, networkURL, 'withdrawal_pending')
            .then(async (contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }
    
                if (!contractState['withdrawal_pending'].hasOwnProperty(wallet)) {
                    return null;
                }

                const blkNumPendingWithdrawal = contractState['withdrawal_pending'][wallet];

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

                    // add total pending amt for deleg stats panel
                    totalPendingAmtBN = totalPendingAmtBN.plus(pendingAmt);
                }
            })
            .catch((err) => {
                console.error(err);
                return null;
            })
            .finally(() => {
                if (mountedRef.current) {
                    setDelegPendingStakeWithdrawalStats([...pendingStakeWithdrawalList]);
                    setTotalClaimableAmt(totalClaimableAmtBN.toString());
                    setTotalPendingWithdrawalAmt(totalPendingAmtBN.toString());
                }
            }), PromiseArea.PROMISE_GET_PENDING_WITHDRAWAL);
    }, [impl, networkURL, currWalletAddress]);

    /* fetch data for delegator staking portfolio panel */
    const getDelegatorStakingPortfolio = useCallback(() => {
        let output: DelegStakingPortfolioStats[] = [];

        const userBase16Address = fromBech32Address(currWalletAddress).toLowerCase();

        trackPromise(ZilliqaAccount.getImplState(impl, 'deposit_amt_deleg')
            .then(async (contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }
    
                if (!contractState['deposit_amt_deleg'].hasOwnProperty(userBase16Address)) {
                    return null;
                }

                // fetch ssnlist for the names
                const ssnContractState = await ZilliqaAccount.getImplState(impl, 'ssnlist');
                
                if (!ssnContractState['ssnlist']) {
                    return null;
                }

                const depositDelegList = contractState['deposit_amt_deleg'][userBase16Address];
                
                for (const ssnAddress in depositDelegList) {
                    if (!depositDelegList.hasOwnProperty(ssnAddress)) {
                        continue;
                    }
                    
                    // compute stake amount
                    const delegAmt = new BN(depositDelegList[ssnAddress]);

                    // compute rewards
                    const delegRewards = new BN(await computeDelegRewards(impl, networkURL, ssnAddress, userBase16Address)).toString();
                    console.log("rewards :%o", delegRewards);

                    const data: DelegStakingPortfolioStats = {
                        ssnName: ssnContractState['ssnlist'][ssnAddress]['arguments'][3],
                        ssnAddress: toBech32Address(ssnAddress),
                        delegAmt: delegAmt.toString(),
                        rewards: delegRewards.toString(),
                    }
                    output.push(data);
                }

            })
            .catch((err) => {
                console.error(err);
                if (mountedRef.current) {
                    setIsError(true);
                }
                return null;
            })
            .finally(() => {
                if (mountedRef.current) {
                    console.log("updating delegator staking portfolio...");
                    setDelegStakingStats([...output]);
                }
            }), PromiseArea.PROMISE_GET_STAKE_PORTFOLIO);
    }, [impl, networkURL, currWalletAddress]);

    // compute number of blocks left before rewards are issued
    const getBlockRewardCountDown = useCallback(() => {
        let tempBlockRewardCount = '0';

        trackPromise(ZilliqaAccount.getNumTxBlocksExplorer(networkURL)
            .then((state) => {
                if (state === undefined || state === OperationStatus.ERROR) {
                    return null;
                }
                const currentBlkNum = parseInt(state) - 1;
                const blockCountdown = calculateBlockRewardCountdown(currentBlkNum, networkURL);
                tempBlockRewardCount = blockCountdown.toString();
            })
            .catch((err) => {
                console.error(err);
                if (mountedRef.current) {
                    setIsError(true);
                }
                return null;
            }).finally(() => {
                console.log("updating block countdown to reward");
                if (mountedRef.current) {
                    setBlockCountToReward(tempBlockRewardCount);
                }
            }));
    }, [networkURL]);

    // generate options list
    // fetch node operator names and address 
    // for the dropdowns in the modals
    const getNodeOptionsList = useCallback(() => {
        let tempNodeOptions: NodeOptions[] = [];

        ZilliqaAccount.getImplState(impl, "ssnlist")
            .then(async (contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }

                for (const operatorAddr in contractState.ssnlist) {
                    if (!contractState.ssnlist.hasOwnProperty(operatorAddr)) {
                        continue;
                    }

                    const ssnArgs = contractState.ssnlist[operatorAddr].arguments;
                    const operatorName = ssnArgs[3];
                    const operatorBech32Addr = toBech32Address(operatorAddr);

                    
                    // get number of delegators
                    const delegNumState = await ZilliqaAccount.getImplState(impl, 'ssn_deleg_amt');
                    let delegNum = '0';

                    if (delegNumState.hasOwnProperty('ssn_deleg_amt') &&
                        operatorAddr in delegNumState['ssn_deleg_amt']) {
                        delegNum = Object.keys(delegNumState['ssn_deleg_amt'][operatorAddr]).length.toString();
                    }

                    const operatorOption: NodeOptions = {
                        address: operatorBech32Addr,
                        name: operatorName,
                        stakeAmt: ssnArgs[1],
                        delegNum: delegNum,
                        commRate: ssnArgs[7],
                    }
                    tempNodeOptions.push(operatorOption);
                }
            })
            .catch((err) => {
                console.error(err);
                if (mountedRef.current) {
                    setIsError(true);
                }
                return null;
            })
            .finally(() => {
                if (!mountedRef.current) {
                    return null;
                }
                setNodeOptions([...tempNodeOptions]);
            });

    }, [impl]);


    /* fetch data for operator stats panel */
    const getOperatorStats = useCallback(() => {
        let name = initOperatorStats.name;
        let stakeAmt = initOperatorStats.stakeAmt;
        let bufferedDeposits = initOperatorStats.bufferedDeposits;
        let delegNum = initOperatorStats.delegNum;
        let commRate = initOperatorStats.commRate;
        let commReward = initOperatorStats.commReward;
        let receiver = initOperatorStats.receiver;

        const userBase16Address = fromBech32Address(currWalletAddress).toLowerCase();

        trackPromise(ZilliqaAccount.getImplState(impl, 'ssnlist')
            .then(async (contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }

                if (!contractState['ssnlist'].hasOwnProperty(userBase16Address)) {
                    return null;
                }

                const ssnArgs = contractState['ssnlist'][userBase16Address]['arguments'];

                // get number of delegators
                const delegNumState = await ZilliqaAccount.getImplState(impl, 'ssn_deleg_amt');

                if (delegNumState.hasOwnProperty('ssn_deleg_amt') &&
                    userBase16Address in delegNumState['ssn_deleg_amt']) {
                    delegNum = Object.keys(delegNumState['ssn_deleg_amt'][userBase16Address]).length.toString();
                }

                name = ssnArgs[3];
                stakeAmt = ssnArgs[1];
                bufferedDeposits = ssnArgs[6];
                commRate = ssnArgs[7];
                commReward = ssnArgs[8];
                receiver = toBech32Address(ssnArgs[9])
            })
            .catch((err) => {
                console.error(err);
                if (mountedRef.current) {
                    setIsError(true);
                }
                return null;
            })
            .finally(() => {
                
                if (mountedRef.current) {
                    console.log("updating operator stats...");
                    const data: OperatorStats = {
                        name: name,
                        stakeAmt: stakeAmt,
                        bufferedDeposits: bufferedDeposits,
                        commRate: commRate,
                        commReward: commReward,
                        delegNum: delegNum,
                        receiver: receiver,
                    }
                    setOperatorStats(data);
                }

            }), PromiseArea.PROMISE_GET_OPERATOR_STATS);
    }, [impl, currWalletAddress]);


    /* fetch data for ssn panel */
    const getSsnStats = useCallback(() => {
        let output: SsnStats[] = [];

        trackPromise(ZilliqaAccount.getImplState(impl, 'ssnlist')
            .then(async (contractState) => {
                if (contractState === undefined || contractState === 'error') {
                    return null;
                }

                for (const ssnAddress in contractState['ssnlist']) {
                    const ssnArgs = contractState['ssnlist'][ssnAddress]['arguments'];
                    let delegNum = '0';
                    let status = SsnStatus.INACTIVE;

                    // get ssn status
                    if (ssnArgs[0]['constructor'] === 'True') {
                        status = SsnStatus.ACTIVE;
                    }

                    // get number of delegators
                    const delegNumState = await ZilliqaAccount.getImplState(impl, 'ssn_deleg_amt');

                    if (delegNumState.hasOwnProperty('ssn_deleg_amt') &&
                        ssnAddress in delegNumState['ssn_deleg_amt']) {
                        delegNum = Object.keys(delegNumState['ssn_deleg_amt'][ssnAddress]).length.toString();
                    }

                    const data: SsnStats = {
                        address: toBech32Address(ssnAddress),
                        name: ssnArgs[3],
                        apiUrl: ssnArgs[5],
                        stakeAmt: ssnArgs[1],
                        bufferedDeposits: ssnArgs[6],
                        commRate: ssnArgs[7],
                        commReward: ssnArgs[8],
                        delegNum: delegNum,
                        status: status,
                    }

                    output.push(data);
                }
            })
            .catch((err) => {
                console.error(err);
                if (mountedRef.current) {
                    setIsError(true);
                }
                return null;
            })
            .finally(() => {
                if (mountedRef.current) {
                    console.log("updating dashboard ssn stats...");
                    setSsnStats([...output]);
                }
            }), PromiseArea.PROMISE_GET_SSN_STATS);
    }, [impl]);


    const toggleTheme = () => {
        if (darkMode.value === true) {
          darkMode.disable();
        } else {
          darkMode.enable();
        }
    }


    const updateRecentTransactions = (type: TransactionType, txnId: string) => {
        let temp = JSON.parse(JSON.stringify(recentTransactions));
        if ((temp.length + 1) > 10) {
            // suppose we add a new element
            // restrict number of elements as local storage has limits
            // recent txn is always in newest to oldest
            // remove last element - last element = oldest txn
            temp.pop();
        }
        // reverse so that order is oldest to newest
        // add new item as last element
        temp = temp.reverse();
        temp.push({type: type, txnId: txnId});

        // restore order back
        setRecentTransactions([...temp].reverse());
        storeLocalItem(currWalletAddress, proxy, networkURL, 'recent-txn', temp.reverse());

        // set recent txn indicator icon
        setIsTxnNotify(true);
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

        if (currRole === Role.DELEGATOR.toString()) {
            getDelegatorStats();
            getDelegatorStakingPortfolio();
            getDelegatorPendingWithdrawal();
            getBlockRewardCountDown();
        } else if (currRole === Role.OPERATOR.toString()) {
            getOperatorStats();
        }

        getSsnStats();

        return () => {
            mountedRef.current = false;
        }

    }, [
        currRole,
        getAccountBalance, 
        getBlockRewardCountDown,
        getNodeOptionsList, 
        getContractConstants, 
        getDelegatorPendingWithdrawal,
        getDelegatorStats,
        getDelegatorStakingPortfolio,
        getOperatorStats,
        getSsnStats
    ]);

    // poll data
    useInterval(() => {
        getAccountBalance();
        getNodeOptionsList();
        getContractConstants();

        if (currRole === Role.DELEGATOR.toString()) {
            getDelegatorStats();
            getDelegatorStakingPortfolio();
            getDelegatorPendingWithdrawal();
            getBlockRewardCountDown();
        } else if (currRole === Role.OPERATOR.toString()) {
            getOperatorStats();
        }

        getSsnStats();

    }, mountedRef, refresh_rate_config);

    const timeout = (delay: number) => {
        return new Promise(res => setTimeout(res, delay));
    }

    // manual poll the data
    const updateData = async () => {
        setIsRefreshDisabled(true);

        getAccountBalance();
        getNodeOptionsList();
        getContractConstants();

        if (currRole === Role.DELEGATOR.toString()) {
            getDelegatorStats();
            getDelegatorStakingPortfolio();
            getDelegatorPendingWithdrawal();
        } else if (currRole === Role.OPERATOR.toString()) {
            getOperatorStats();
        }

        getSsnStats();

        // prevent users from spamming manual refresh
        await timeout(Constants.MANUAL_REFRESH_DELAY);
        setIsRefreshDisabled(false);
    };

    // re-hydrate data from localstorage
    useEffect(() => {
        let txns = getLocalItem(currWalletAddress, proxy, networkURL, 'recent-txn', [] as any); 
        setRecentTransactions(txns);
    }, [currWalletAddress, proxy, networkURL]);

    const networkChanger = (net: string) => {
        let networkLabel = "";
        let url = '';

        switch (net) {
            case NetworkLabel.MAINNET:
                // do nothing
                Alert("info", "Info", "You are on Mainnet.");
                networkLabel = NetworkLabel.MAINNET;
                url = NetworkURL.MAINNET;
                break;
            case NetworkLabel.TESTNET:
                networkLabel = NetworkLabel.TESTNET;
                url = NetworkURL.TESTNET;
                if (environment_config === Environment.PROD) {
                    // warn users not to switch to testnet on production
                    Alert("warn", "Testnet not supported", "Please switch to Mainnet via ZilPay.");
                }
                break;
            case NetworkLabel.ISOLATED_SERVER:
            case NetworkLabel.PRIVATE:
                networkLabel = NetworkLabel.ISOLATED_SERVER;
                url = NetworkURL.ISOLATED_SERVER;
                if (environment_config === Environment.PROD) {
                    // warn users not to switch to testnet on production
                    Alert("warn", "Private network not supported", "Please switch to Mainnet via ZilPay.");
                }
                break;
            default:
                break;
        }

        ZilliqaAccount.changeNetwork(url);
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
                console.log("zil pay method ...");
                // switch to the zilpay network on load
                networkChanger(zilPay.wallet.net);

                const accountStreamChanged = zilPay.wallet.observableAccount();
                const networkStreamChanged = zilPay.wallet.observableNetwork();

                networkStreamChanged.subscribe((net: string) => networkChanger(net));
                
                accountStreamChanged.subscribe((account: any) => {
                    console.log("zil pay account changing...");
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

        if (!isAuth || isError) {
            // redirect to login request
            props.history.push("/oops");
        }

        // eslint-disable-next-line
    }, [isError, isAuth, props.history]);

    // change to correct role for zilpay switch
    // this is equilvant to a setState callback for setCurrWalletAddress, setNetworkURL
    // because setState is async - have to execute these functions from useEffect
    // when wallet address change (zilpay switch account)
    // when network change (zilpay switch network)
    useEffect(() => {
        console.log("unified change network");
        if (!currWalletAddress) {
            return;
        }
        updateCurrentRole(fromBech32Address(currWalletAddress).toLowerCase());
    }, [currWalletAddress, updateCurrentRole]);

    
    // prevent user from refreshing
    useEffect(() => {
        window.onbeforeunload = (e: any) => {
            e.preventDefault();
            e.returnValue = 'The page auto retrieves data periodically. Please do not force refresh as you will lose your wallet connection.';
            setTimeout(() => {
                toast.dismiss();
            }, 8000);
            return (
                Alert("warn", "Warning", "The app auto retrieves data periodically. Please do not force refresh as you will lose your wallet connection.")
            );
        }
    }, []);

    // eslint-disable-next-line
    return (
        <>
        <nav className="navbar navbar-expand-lg navbar-dark">
            <button type="button" className="btn navbar-brand shadow-none p-0 pl-2">
                <span>
                    <img className="logo mx-auto" src={logo} alt="zilliqa_logo"/>
                    <span className="navbar-title">ZILLIQA STAKING</span>
                </span>
            </button>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarSupportedContent">
                <ul className="navbar-nav mr-auto">
                </ul>
                <ul className="navbar-nav navbar-right">

                    {/* wallet address */}
                    <li className="nav-item">
                        <p className="px-1">{currWalletAddress ? <a href={getAddressLink(currWalletAddress, networkURL)} className="wallet-link" target="_blank" rel="noopener noreferrer">{currWalletAddress}</a> : 'No wallet detected'}</p>
                    </li>
                    
                    {/* balance */}
                    <li className="nav-item">
                        <p className="px-1">{balance ? convertQaToCommaStr(balance) : '0.000'} ZIL</p>
                    </li>

                    {/* network */}
                    <li className="nav-item">
                        { networkURL === NetworkURL.TESTNET && <p className="px-1">Testnet</p> }
                        { networkURL === NetworkURL.MAINNET && <p className="px-1">Mainnet</p> }
                        { networkURL === NetworkURL.ISOLATED_SERVER && <p className="px-1">Isolated Server</p> }
                    </li>

                    <li className="nav-item">
                        <button type="button" className="btn btn-notify-dropdown btn-theme shadow-none mx-2" onClick={toggleTheme}>
                        { 
                            darkMode.value === true ? 
                            <IconSun width="16" height="16"/> : 
                            <IconMoon width="16" height="16"/>
                        }
                        </button>
                    </li>

                    {/* txn notifications */}
                    <li className="nav-item">
                        <Tippy 
                            content={<RecentTxnDropdown data={recentTransactions} networkURL={networkURL} />} 
                            animation="shift-away-subtle"
                            trigger="click"
                            arrow={false}
                            interactive={true}
                            placement="bottom-end"
                            appendTo="parent"
                            onMount={() => setAriaExpanded(true)}
                            onHide={() => setAriaExpanded(false)}>
                                <button 
                                    type="button" 
                                    className="btn btn-notify-dropdown shadow-none" 
                                    onClick={handleTxnNotify} 
                                    aria-haspopup="true" 
                                    aria-expanded={ariaExpanded}
                                    data-tip
                                    data-for="notification-tip">
                                        <div className="dropdown-notify-wrapper">
                                            <IconBell width="16" height="16" className="dropdown-toggle-icon" />
                                            { isTxnNotify && <IconCheckboxBlankCircle width="10" height="10" className="dropdown-notify-icon" /> }
                                        </div>
                                </button>
                        </Tippy>
                        <ReactTooltip id="notification-tip" place="bottom" type="dark" effect="solid">
                            <span>Recent Transactions</span>
                        </ReactTooltip>
                    </li>

                    <li className="nav-item">
                        <button type="button" className="btn btn-sign-out mx-2" onClick={cleanUp}>Sign Out</button>
                    </li>
                </ul>
            </div>
        </nav>

        {
            ContractState.IS_PAUSED.toString() === 'true' &&
            <WarningDashboardBanner />
        }        

        <div id="dashboard" className="container-fluid h-100">
            <div className="row h-100">
                <div id="content" className="col pt-4">
                    <div className="container-xl">
                        <div className="row">
                            <div className="col-12">
                                <div className="d-flex justify-content-end">
                                    <button type="button" className="btn btn-user-secondary-action shadow-none" onClick={updateData} data-tip data-for="refresh-tip" disabled={isRefreshDisabled}><IconRefresh width="20" height="20" /></button>
                                    <ReactTooltip id="refresh-tip" place="bottom" type="dark" effect="solid">
                                        <span>Refresh</span>
                                    </ReactTooltip>
                                </div>

                                
                                {/* delegator section */}
                                {/* complete withdrawal */}
                                {
                                    (currRole === Role.DELEGATOR.toString()) &&

                                    

                                    <CompleteWithdrawalTable 
                                        impl={impl} 
                                        network={networkURL} 
                                        refresh={refresh_rate_config} 
                                        userAddress={currWalletAddress}
                                        data={delegPendingStakeWithdrawalStats}
                                        totalClaimableAmt={totalClaimableAmt} />
                                }

                                {
                                    (currRole === Role.OPERATOR.toString()) &&

                                    <>
                                    {/* node operator section */}

                                    <div className="p-4 mt-4 dashboard-card">
                                        <h5 className="card-title mb-4">Hi {operatorStats.name ? operatorStats.name : 'Operator'}! What would you like to do today?</h5>
                                        <button 
                                            type="button" 
                                            className="btn btn-contract mr-4 shadow-none" 
                                            data-toggle="modal" 
                                            data-target="#update-comm-rate-modal" 
                                            data-keyboard="false" 
                                            data-backdrop="static" 
                                            disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false}>
                                                {ContractState.IS_PAUSED.toString() === 'true' ? ButtonText.NOT_AVAILABLE : 'Update Commission'}
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-contract mr-4 shadow-none" 
                                            data-toggle="modal" 
                                            data-target="#update-recv-addr-modal" 
                                            data-keyboard="false" 
                                            data-backdrop="static" 
                                            disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false}>
                                                {ContractState.IS_PAUSED.toString() === 'true' ? ButtonText.NOT_AVAILABLE : 'Update Receiving Address'}
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-contract mr-4 shadow-none" 
                                            data-toggle="modal" 
                                            data-target="#withdraw-comm-modal" 
                                            data-keyboard="false" 
                                            data-backdrop="static" 
                                            disabled={ContractState.IS_PAUSED.toString() === 'true' ? true : false}>
                                                {ContractState.IS_PAUSED.toString() === 'true' ? ButtonText.NOT_AVAILABLE : 'Withdraw Commission'}
                                        </button>
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
                                                <DelegatorStatsTable 
                                                    impl={impl} 
                                                    network={networkURL} 
                                                    refresh={refresh_rate_config} 
                                                    userAddress={currWalletAddress}
                                                    data={delegStats}
                                                    totalPendingWithdrawalAmt={totalPendingWithdrawalAmt}
                                                    blockCountToReward={blockCountToReward} />
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
                                                    <h6 className="inner-section-heading px-4 pt-4 pb-3">Deposits <span data-tip data-for="deposit-question"><IconQuestionCircle width="16" height="16" className="section-icon" /></span></h6>
                                                    <StakingPortfolio 
                                                        impl={impl} 
                                                        network={networkURL} 
                                                        refresh={refresh_rate_config} 
                                                        userAddress={currWalletAddress}
                                                        data={delegStakingStats}
                                                        setClaimedRewardModalData={setClaimedRewardModalData}
                                                        setTransferStakeModalData={setTransferStakeModalData}
                                                        setWithdrawStakeModalData={setWithdrawStakeModalData} />
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
                                                <OperatorStatsTable 
                                                    impl={impl} 
                                                    network={networkURL} 
                                                    refresh={refresh_rate_config} 
                                                    userAddress={currWalletAddress}
                                                    data={operatorStats} />
                                            </div>
                                        </div>
                                    </div>
                                }

                                <div id="dashboard-ssn-details" className="p-4 dashboard-card container-fluid">
                                    <div className="row">
                                        <div className="col">
                                            <h5 className="card-title mb-4">Staked Seed Nodes</h5>
                                            <p className="info mt-4">Please refer to our&nbsp; 
                                                <a className="info-link" href={networks_config[convertNetworkUrlToLabel(networkURL)].node_status ? 
                                                    networks_config[convertNetworkUrlToLabel(networkURL)].node_status : 
                                                    "https://zilliqa.com/"} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer">
                                                        Staking Viewer 
                                                </a> 
                                                &nbsp;for more information on the nodes' statuses.
                                            </p>
                                        </div>
                                        <div className="col-12 text-center">
                                            <SsnTable 
                                                impl={impl} 
                                                network={networkURL} 
                                                blockchainExplorer={blockchain_explorer_config} 
                                                refresh={refresh_rate_config} 
                                                currRole={currRole} 
                                                data={ssnStats}
                                                totalStakeAmt={totalStakeAmt}
                                                showStakeBtn={true}
                                                setDelegStakeModalData={setDelegStakeModalData}
                                                />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <ToastContainer 
                                        hideProgressBar={true} 
                                        autoClose={10000} 
                                        pauseOnHover />
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer networkLabel={convertNetworkUrlToLabel(networkURL)} />
            <DisclaimerModal />

            <UpdateCommRateModal 
                proxy={proxy}
                impl={impl} 
                networkURL={networkURL} 
                currentRate={operatorStats.commRate} 
                ledgerIndex={ledgerIndex}
                updateData={updateData}
                updateRecentTransactions={updateRecentTransactions} />

            <UpdateReceiverAddress 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                currentReceiver={operatorStats.receiver} 
                ledgerIndex={ledgerIndex}
                updateData={updateData}
                updateRecentTransactions={updateRecentTransactions} />

            <WithdrawCommModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                currentRewards={operatorStats.commReward} 
                ledgerIndex={ledgerIndex}
                updateData={updateData}
                updateRecentTransactions={updateRecentTransactions} />

            <DelegateStakeModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={nodeOptions}
                minDelegStake={minDelegStake}
                updateData={updateData}
                updateRecentTransactions={updateRecentTransactions}
                delegStakeModalData={delegStakeModalData}
                balance={balance} />

            <ReDelegateStakeModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                ledgerIndex={ledgerIndex} 
                nodeSelectorOptions={nodeOptions}
                userAddress={currWalletAddress}
                updateData={updateData}
                updateRecentTransactions={updateRecentTransactions}
                transferStakeModalData={transferStakeModalData}
                minDelegStake={minDelegStake} />

            <WithdrawStakeModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                ledgerIndex={ledgerIndex} 
                userAddress={currWalletAddress}
                updateData={updateData}
                updateRecentTransactions={updateRecentTransactions}
                withdrawStakeModalData={withdrawStakeModalData}
                minDelegStake={minDelegStake} />

            <WithdrawRewardModal 
                proxy={proxy} 
                impl={impl} 
                networkURL={networkURL} 
                ledgerIndex={ledgerIndex} 
                userAddress={currWalletAddress}
                updateData={updateData}
                updateRecentTransactions={updateRecentTransactions}
                claimedRewardsModalData={claimedRewardsModalData} />

            <CompleteWithdrawModal 
                proxy={proxy}
                impl={impl}  
                networkURL={networkURL} 
                ledgerIndex={ledgerIndex}
                updateData={updateData}
                updateRecentTransactions={updateRecentTransactions} />
                
        </div>
        </>
    );
}

export default Dashboard;