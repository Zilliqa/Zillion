import { toBech32Address } from '@zilliqa-js/zilliqa';
import { BigNumber } from 'bignumber.js';
import { all, call, delay, fork, put, race, select, take, takeLatest } from 'redux-saga/effects';
import { PRELOAD_INFO_READY, UPDATE_REWARD_BLK_COUNTDOWN } from '../store/stakingSlice';
import { 
    INIT_USER, 
    UPDATE_ROLE, 
    UPDATE_BALANCE, 
    UPDATE_GZIL_BALANCE, 
    UPDATE_SWAP_DELEG_MODAL, 
    UPDATE_PENDING_WITHDRAWAL_LIST, 
    UPDATE_COMPLETE_WITHDRAWAL_AMT, 
    UPDATE_OPERATOR_STATS, 
    UPDATE_FETCH_OPERATOR_STATS_STATUS, 
    POLL_USER_DATA_START, 
    POLL_USER_DATA_STOP, 
    QUERY_AND_UPDATE_USER_STATS, 
    UPDATE_DELEG_STATS, 
    UPDATE_DELEG_PORTFOLIO, 
    UPDATE_FETCH_DELEG_STATS_STATUS,
    UPDATE_VAULTS, 
    UPDATE_VAULTS_BALANCE,
    UPDATE_VAULTS_ID_ADDRESS_MAP,
    UPDATE_VAULTS_PENDING_WITHDRAW_LIST,
    UPDATE_VAULTS_OWNERSHIP_REQUEST_LIST,
    UPDATE_VAULTS_OWNERSHIP_RECEIVED_LIST} from '../store/userSlice';
import { getRefreshRate } from '../util/config-json-helper';
import { OperationStatus, Role, StakingMode } from '../util/enum';
import { DelegStakingPortfolioStats, DelegStats, initialDelegStats, initialOperatorStats, initialSwapDelegModalData, initVaultData, LandingStats, OperatorStats, PendingWithdrawStats, SsnStats, SwapDelegModalData, VaultData, VaultTransferData } from '../util/interface';
import { logger } from '../util/logger';
import { computeDelegRewards } from '../util/reward-calculator';
import { calculateBlockRewardCountdown, isRespOk } from '../util/utils';
import { ZilSdk } from '../zilliqa-api';
import { getUserState, getBlockchain, getStakingState } from './selectors';

const REFRESH_INTERVAL = getRefreshRate();

/**
 * query the connected wallet's balance and update the balance in the store
 */
function* queryAndUpdateBalance() {
    logger("check balance");
    try {
        const { address_base16 } = yield select(getUserState);
        const balance: string = yield call(ZilSdk.getBalance, address_base16);
        
        logger("wallet: ", address_base16);
        logger("user balance: ", balance);
        yield put(UPDATE_BALANCE({ balance: balance }));
    } catch (e) {
        console.warn("query and update balance failed");
        yield put(UPDATE_BALANCE({ balance: "0" }));
    }
}

/**
 * checks if the connected wallet is an operator or delegator and update the role in the store accordingly
 */
 function* queryAndUpdateRole() {
    logger("check role");
    try {
        const { address_base16, selected_role } = yield select(getUserState);
        const { impl } = yield select(getBlockchain);
        const isOperator: boolean = yield call(ZilSdk.isOperator, impl, address_base16);

        let role;
        if (selected_role === Role.OPERATOR && !isOperator) {
            console.error("user is not operator");
            role = Role.DELEGATOR;
        } else if (selected_role === Role.OPERATOR && isOperator) {
            role = Role.OPERATOR;
        } else {
            // defaults to delegator
            role = Role.DELEGATOR;
        }
        yield put(UPDATE_ROLE({ role: role }));
    } catch (e) {
        console.warn("query and update role failed");
        console.warn(e);
    }
}

/**
 * fetch gzil balance
 */
function* queryAndUpdateGzil() {
    logger("check gzil");
    try {
        const { impl } = yield select(getBlockchain);
        const { address_base16 } = yield select(getUserState);
        
        let gzilAddrResolved;
        const { gzil_address } = yield select(getStakingState);
        if (gzil_address && gzil_address !== null) {
            gzilAddrResolved = gzil_address;
        } else {
            // gzil_address param might be empty because the store is not updated yet
            const { gziladdr } = yield call(ZilSdk.getSmartContractSubState, impl, 'gziladdr');
            gzilAddrResolved = gziladdr;
        }
        
        const response: Object = yield call(ZilSdk.getSmartContractSubState, gzilAddrResolved, 'balances', [address_base16]);
        logger("gzil response: ", response);

        if (!isRespOk(response)) {
            yield put(UPDATE_GZIL_BALANCE({ gzil_balance: "0" }));
        } else {
            yield put(UPDATE_GZIL_BALANCE({ gzil_balance: (response as any)['balances'][address_base16] }));
        }
    } catch (e) {
        console.warn("query and update gzil failed");
        console.warn(e);
        yield put(UPDATE_GZIL_BALANCE({ gzil_balance: "0" }));
    }
}

/**
 * populate delegator staking portfolio and delegator stats
 */
function* populateStakingPortfolio() {
    console.log("populate staking portfolio");
    try {
        const { address_base16, gzil_balance } = yield select(getUserState);
        const { impl } = yield select(getBlockchain);
        const response: Object = yield call(ZilSdk.getSmartContractSubState, impl, 'deposit_amt_deleg', [address_base16]);
        logger("deposit deleg list: ", response);

        const { landing_stats, ssn_list } = yield select(getStakingState);
        const depositAmtDeleg = (isRespOk(response) === true) ? (response as any)['deposit_amt_deleg'][address_base16] : null;
        let staking_portfolio_list: DelegStakingPortfolioStats[] = [];
        let totalDeposits = new BigNumber(0);
        let totalRewards = new BigNumber(0);
        
        for (const ssnAddress in depositAmtDeleg) {
            // compute total deposits
            const deposit = new BigNumber(depositAmtDeleg[ssnAddress]);
            totalDeposits = totalDeposits.plus(deposit);

            // compute zil rewards
            const delegRewards: string = yield call(computeDelegRewards, impl, ssnAddress, address_base16)
            const rewards = new BigNumber(delegRewards);
            totalRewards = totalRewards.plus(rewards);

            const ssnAddressBech32 = toBech32Address(ssnAddress);
            const stakingStats: DelegStakingPortfolioStats = {
                ssnName: (ssn_list as SsnStats[]).find(ssn => ssn.address === ssnAddressBech32)?.name || '',
                ssnAddress: ssnAddressBech32,
                delegAmt: `${deposit}`,
                rewards: `${rewards}`,
                vaultAddress: '0x0000000000000000000000000000000000000000',
                vaultId: -1
            }
            staking_portfolio_list.push(stakingStats);
        }

        logger("staking portfolio: ", staking_portfolio_list);

        const delegStats: DelegStats = {
            globalAPY: (landing_stats as LandingStats).estRealtimeAPY,
            gzilBalance: gzil_balance,
            gzilRewards: `${totalRewards}`,
            zilRewards: `${totalRewards}`,
            totalDeposits: `${totalDeposits}`
        }

        yield put(UPDATE_DELEG_STATS({ deleg_stats: delegStats }));
        yield put(UPDATE_DELEG_PORTFOLIO({ portfolio_list: staking_portfolio_list }));
    } catch (e) {
        console.warn("populate staking portfolio failed");
        console.warn(e);
        yield put(UPDATE_DELEG_STATS({ deleg_stats: initialDelegStats }));
        yield put(UPDATE_DELEG_PORTFOLIO({ portfolio_list: [] }));
    }
}

/**
 * popoulate swap deleg requests
 */
function* populateSwapRequests() {
    console.log("populate swap requests");
    try {
        const { address_base16 } = yield select(getUserState);
        const { impl } = yield select(getBlockchain);
        const { deleg_swap_request } = yield call(ZilSdk.getSmartContractSubState, impl, 'deleg_swap_request');

        let swapRecipientAddress = '';
        let requestorList: any = [];
        
        if (address_base16 in deleg_swap_request) {
            swapRecipientAddress = deleg_swap_request[address_base16];
        }

        // get the list of requestors that is pending for this wallet to accept
        // reverse the mapping
        let reverseMap = Object.keys(deleg_swap_request).reduce((newMap: any, k) => {
            let receipientAddr = deleg_swap_request[k];
            newMap[receipientAddr] = newMap[receipientAddr] || [];
            newMap[receipientAddr].push(k)
            return newMap;
        }, {});

        if (address_base16 in reverseMap) {
            requestorList = reverseMap[address_base16];
        }

        const swapDelegModal : SwapDelegModalData = {
            swapRecipientAddress: swapRecipientAddress,
            requestorList: requestorList
        }

        yield put(UPDATE_SWAP_DELEG_MODAL({ swap_deleg_modal: swapDelegModal }));
    } catch (e) {
        console.warn("populate swap requests failed");
        console.warn(e);
        yield put(UPDATE_SWAP_DELEG_MODAL({ swap_deleg_modal: initialSwapDelegModalData }));
    }
}

/**
 * populate pending withdrawal
 */
function* populatePendingWithdrawal() {
    console.log("populate pending withdrawal");
    try {
        const { address_base16 } = yield select(getUserState);
        const { impl } = yield select(getBlockchain);
        const response: Object = yield call(ZilSdk.getSmartContractSubState, impl, 'withdrawal_pending', [address_base16]);

        logger("pending withdrawal: ", response);

        if (!isRespOk(response)) {
            throw new Error("no pending withdrawal for address");
        }

        let progress = '0';
        let pendingWithdrawList: PendingWithdrawStats[] = [];
        let totalWithdrawAmt = new BigNumber(0);
        const pendingWithdrawal = (response as any)['withdrawal_pending'][address_base16];
        const { min_bnum_req } = yield select(getStakingState);
        const numTxBlk: string = yield call(ZilSdk.getNumTxBlocks);
        const currBlkNum = isRespOk(numTxBlk) === true ? new BigNumber(numTxBlk).minus(1) : new BigNumber(0);

        for (const blkNum in pendingWithdrawal) {
            // compute each pending stake withdrawal progress
            let pendingAmt = new BigNumber(pendingWithdrawal[blkNum]);
            let blkNumCheck = new BigNumber(blkNum).plus(min_bnum_req);
            let blkNumCountdown = blkNumCheck.minus(currBlkNum); // may be negative
            let completed = new BigNumber(0);

            // compute progress using blk num countdown ratio
            if (blkNumCountdown.isLessThanOrEqualTo(0)) {
                // can withdraw
                totalWithdrawAmt = totalWithdrawAmt.plus(pendingAmt)
                blkNumCountdown = new BigNumber(0);
                completed = new BigNumber(1);
            } else {
                // still have pending blks
                // 1 - (countdown/blk_req)
                const processed = blkNumCountdown.dividedBy(min_bnum_req);
                completed = new BigNumber(1).minus(processed);
            }

            // convert progress to percentage
            progress = completed.times(100).toFixed(2);

            pendingWithdrawList.push({
                amount: `${pendingAmt}`,
                blkNumCountdown: `${blkNumCountdown}`,
                blkNumCheck: `${blkNumCheck}`,
                progress: `${progress}`
            } as PendingWithdrawStats)
        }
        logger(pendingWithdrawList);
        
        yield put(UPDATE_PENDING_WITHDRAWAL_LIST({ pending_withdraw_list: pendingWithdrawList }));
        yield put(UPDATE_COMPLETE_WITHDRAWAL_AMT({ complete_withdrawal_amt: `${totalWithdrawAmt}` }));
    } catch (e) {
        console.warn("populate pending withdrawal failed");
        yield put(UPDATE_PENDING_WITHDRAWAL_LIST({ pending_withdraw_list: [] }));
        yield put(UPDATE_COMPLETE_WITHDRAWAL_AMT({ complete_withdrawal_amt: "0" }));
    }
}

/**
 * populate number of blocks before rewards are issued
 * for deleg stats
 */
function* populateRewardBlkCountdown() {
    try {
        const { blockchain } = yield select(getBlockchain);
        let rewardBlkCountdown = 0;
        const numTxBlk: string = yield call(ZilSdk.getNumTxBlocks);

        if (isRespOk(numTxBlk)) {
            const currBlkNum = parseInt(numTxBlk) - 1;
            rewardBlkCountdown = yield call(calculateBlockRewardCountdown, currBlkNum, blockchain)
        }
        yield put(UPDATE_REWARD_BLK_COUNTDOWN({ reward_blk_countdown: `${rewardBlkCountdown}` }))
    } catch (e) {
        console.warn("populate reward blk countdown failed");
        yield put(UPDATE_REWARD_BLK_COUNTDOWN({ reward_blk_countdown: "0" }))
    }
}

/**
 * populate users' vault ids and each vault's stake
 */
function* populateVaultStakingStats() {
    try {
        const { address_base16 } = yield select(getUserState);
        const { impl, staking_data } = yield select(getBlockchain);
        const { ssn_list } = yield select(getStakingState);

        const response:Object = yield call(ZilSdk.getSmartContractSubState, staking_data, 'allocated_user_vault', [address_base16]);

        if (!isRespOk(response)) {
            throw new Error("no vaults");
        }

        /**
         * [
         *   {
         *     vault_id: [
         *       {ssn_name, ssn_address, deleg_amt, rewards, vault_id, vault_address},
         *       {ssn_name, ssn_address, deleg_amt, rewards, vault_id, vault_address},
         *     ]
         *   }
         * ]
         */
        let vaults = [] as any;
        let vaultsBalances: any = {};
        let vaultIdAddrMap: any = {};

        const vaultIdsList = (response as any)['allocated_user_vault'][address_base16];

        for (let [vault_id, vault_address] of Object.entries(vaultIdsList)) {
            console.log(`vault_id: ${vault_id}, vault_address: ${vault_address}`);

            const _vault_id: number = Number(vault_id);
            const _vault_address: string = vault_address as any;

            vaultIdAddrMap[_vault_id] = _vault_address;

            const resp: Object = yield call(ZilSdk.getSmartContractSubState, impl, 'deposit_amt_deleg', [_vault_address]);
            const depositAmtDeleg = (isRespOk(resp) === true) ? (resp as any)['deposit_amt_deleg'][_vault_address] : null;

            let vaultInfo = {} as any;
            let stakingList = [];

            for (const ssnAddress in depositAmtDeleg) {
                // compute deposits
                const deposit = new BigNumber(depositAmtDeleg[ssnAddress]);

                // compute zil rewards
                const delegRewards: string = yield call(computeDelegRewards, impl, ssnAddress, _vault_address);
                const rewards = new BigNumber(delegRewards);
                const ssnAddressBech32 = toBech32Address(ssnAddress);
                const stakingStats = {
                    ssnName: (ssn_list as SsnStats[]).find(ssn => ssn.address === ssnAddressBech32)?.name || '',
                    ssnAddress: ssnAddressBech32,
                    delegAmt: `${deposit}`,
                    rewards: `${rewards}`,
                    vaultAddress: _vault_address,
                    vaultId: _vault_id
                }
                stakingList.push(stakingStats);
                console.log("staking stats: ", stakingList);
            }

            // fetch zil and bzil balance of the vault
            let vaultTokenBalances = {
                bzilBalance: initVaultData.bzilBalance,
                zilBalance: initVaultData.zilBalance,
            } as VaultData;
            const resp2: Object = yield call(ZilSdk.getSmartContractSubState, _vault_address, 'bzil_balance');
            const resp3: Object = yield call(ZilSdk.getBalance, _vault_address);

            console.log("resp3: ", resp3);

            if (isRespOk(resp2)) {
                vaultTokenBalances.bzilBalance = String((resp2 as any)['bzil_balance'])
            }

            if (isRespOk(resp3)) {
                vaultTokenBalances.zilBalance = String((resp3 as any));
            }

            vaultInfo[_vault_id] = stakingList;
            vaultsBalances[_vault_id] = vaultTokenBalances;
            vaults.push(vaultInfo);
        }

        console.log("my vault: ", vaults);

        yield put(UPDATE_VAULTS(vaults));
        yield put(UPDATE_VAULTS_ID_ADDRESS_MAP(vaultIdAddrMap));
        yield put(UPDATE_VAULTS_BALANCE(vaultsBalances));
        
    } catch (e) {
        console.warn("populate vaults failed");
        yield put(UPDATE_VAULTS([]));
        yield put(UPDATE_VAULTS_ID_ADDRESS_MAP({}));
    }
}

/**
 * populate vaults' pending withdrawal
 * @TODO combine or refactor with populateVaultStakingStats to reduce repeated codes
 */
function* populateVaultsPendingWithdrawal() {
    try {
        const { address_base16 } = yield select(getUserState);
        const { impl, staking_data } = yield select(getBlockchain);

        const response:Object = yield call(ZilSdk.getSmartContractSubState, staking_data, 'allocated_user_vault', [address_base16]);

        if (!isRespOk(response)) {
            throw new Error("no vaults");
        }

        const vaultIdsList = (response as any)['allocated_user_vault'][address_base16];

        /**
         * [
         *   {
         *     vault_id: [
         *       { amount, blkNumCountdown, blkNumCheck, progress }
         *     ]
         *   }
         * ]
         */

        // compute pending withdrawal rewards
        let vaults = [] as any;
        
        let totalWithdrawAmt = new BigNumber(0);
        const { min_bnum_req } = yield select(getStakingState);
        const numTxBlk: string = yield call(ZilSdk.getNumTxBlocks);
        const currBlkNum = isRespOk(numTxBlk) === true ? new BigNumber(numTxBlk).minus(1) : new BigNumber(0);

        for (let [vault_id, vault_address] of Object.entries(vaultIdsList)) {
            console.log(`vault_id: ${vault_id}, vault_address: ${vault_address}`);

            const _vault_id: number = Number(vault_id);
            const _vault_address: string = vault_address as any;

            const response: Object = yield call(ZilSdk.getSmartContractSubState, impl, 'withdrawal_pending', [_vault_address]);
            
            logger("populateVaultsPendingWithdrawal - pending withdrawal: ", response);

            if (!isRespOk(response)) {
                // withdrawl pending response may throw error if vault has no pending withdrawal
                // skip these vault addresses without pending withdrawal
                continue;
            }

            let vaultInfo = {} as any;
            let pendingWithdrawList: PendingWithdrawStats[] = [];

            let progress = '0';
            const pendingWithdrawal = (response as any)['withdrawal_pending'][_vault_address];
    
            for (const blkNum in pendingWithdrawal) {
                // compute each pending stake withdrawal progress
                let pendingAmt = new BigNumber(pendingWithdrawal[blkNum]);
                let blkNumCheck = new BigNumber(blkNum).plus(min_bnum_req);
                let blkNumCountdown = blkNumCheck.minus(currBlkNum); // may be negative
                let completed = new BigNumber(0);
    
                // compute progress using blk num countdown ratio
                if (blkNumCountdown.isLessThanOrEqualTo(0)) {
                    // can withdraw
                    totalWithdrawAmt = totalWithdrawAmt.plus(pendingAmt)
                    blkNumCountdown = new BigNumber(0);
                    completed = new BigNumber(1);
                } else {
                    // still have pending blks
                    // 1 - (countdown/blk_req)
                    const processed = blkNumCountdown.dividedBy(min_bnum_req);
                    completed = new BigNumber(1).minus(processed);
                }
    
                // convert progress to percentage
                progress = completed.times(100).toFixed(2);
    
                pendingWithdrawList.push({
                    amount: `${pendingAmt}`,
                    blkNumCountdown: `${blkNumCountdown}`,
                    blkNumCheck: `${blkNumCheck}`,
                    progress: `${progress}`
                } as PendingWithdrawStats)
            }

            vaultInfo[_vault_id] = pendingWithdrawList;
            vaults.push(vaultInfo);

            console.log("vaults pending withdrawal: ", vaults);
        }

        yield put(UPDATE_VAULTS_PENDING_WITHDRAW_LIST(vaults));
    } catch (e) {
        console.warn("populate vaults pending withdrawal failed: ", e);
        yield put(UPDATE_VAULTS_PENDING_WITHDRAW_LIST([]));
    }
}

/**
 * populate data for vaults ownership transfer request
 */
function* populateVaultsTransferRequest() {
    try {
        const { address_base16 } = yield select(getUserState);
        const { staking_data } = yield select(getBlockchain);

        const resp:Object = yield call(ZilSdk.getSmartContractSubState, staking_data, 'pending_vault_transfer', [address_base16]);

        if (!isRespOk(resp)) {
            throw new Error("no vaults transfer request");
        }

        const requestMap = (resp as any)['pending_vault_transfer'][address_base16];

        let requestList: VaultTransferData[] = [];

        for (let [vault_id, new_owner] of Object.entries(requestMap)) {
            requestList.push({
                vaultId: Number(vault_id),
                initOwner: address_base16,
                newOwner: new_owner,
            } as VaultTransferData);
        }

        yield put(UPDATE_VAULTS_OWNERSHIP_REQUEST_LIST(requestList));

    } catch (e) {
        console.warn("populate vaults ownership transfer sent failed: ", e);
        yield put(UPDATE_VAULTS_OWNERSHIP_REQUEST_LIST([]));
    }
}

/**
 * populate data for vaults ownership transfer received
 */
function* populateVaultsTransferReceived() {
    try {
        const { address_base16 } = yield select(getUserState);
        const { staking_data } = yield select(getBlockchain);

        const resp:Object = yield call(ZilSdk.getSmartContractSubState, staking_data, 'pending_vault_transfer');

        if (!isRespOk(resp)) {
            throw new Error("no pending vaults transfer");
        }

        const vaultTransferMap = (resp as any)['pending_vault_transfer'];

        let receivedList: VaultTransferData[] = [];

        for (let [init_owner, request_map] of Object.entries(vaultTransferMap) as [string, any]) {
            for (let [vault_id, new_owner] of Object.entries(request_map)) {
                if (new_owner === address_base16) {
                    receivedList.push({
                        vaultId: Number(vault_id),
                        initOwner: init_owner,
                        newOwner: new_owner,
                    } as VaultTransferData);
                }
            }
        }

        yield put(UPDATE_VAULTS_OWNERSHIP_RECEIVED_LIST(receivedList));

    } catch (e) {
        console.warn("populate vaults ownership transfer received failed: ", e);
        yield put(UPDATE_VAULTS_OWNERSHIP_RECEIVED_LIST([]));
    }
}

function* pollDelegatorData() {
    const { staking_mode } = yield select(getUserState);

    console.log("staking modeeee: ", staking_mode);

    // always run
    yield fork(populateRewardBlkCountdown)

    // run via certain staking modes
    switch (staking_mode) {
        case StakingMode.BZIL:
            yield fork(populateVaultStakingStats)
            yield fork(populateVaultsPendingWithdrawal)
            yield fork(populateVaultsTransferRequest)
            yield fork(populateVaultsTransferReceived)
            break;
        case StakingMode.ZIL:
        default:
            yield fork(populateStakingPortfolio)
            yield fork(populateSwapRequests)
            yield fork(populatePendingWithdrawal)
    }
}

function* populateOperatorStats() {
    console.log("populate operator stats");
    try {
        yield put(UPDATE_FETCH_OPERATOR_STATS_STATUS(OperationStatus.PENDING));

        const { impl } = yield select(getBlockchain);
        const { address_base16 } = yield select(getUserState);
        const response: Object = yield call(ZilSdk.getSmartContractSubState, impl, 'ssnlist', [address_base16]);

        if (!isRespOk(response)) {
            throw new Error("no such operator");
        }

        const ssnInfo = (response as any)['ssnlist'][address_base16];
        const ssnArgs = ssnInfo['arguments'];
        
        // get number of deleg
        const delegQuery: Object = yield call(ZilSdk.getSmartContractSubState, impl, 'ssn_deleg_amt', [address_base16]);
        const delegNum = isRespOk(delegQuery) === true ? Object.keys((delegQuery as any)['ssn_deleg_amt'][address_base16]).length : 0;

        const operatorStats: OperatorStats = {
            name: ssnArgs[3],
            stakeAmt: ssnArgs[1],
            bufferedDeposits: ssnArgs[6],
            commRate: ssnArgs[7],
            commReward: ssnArgs[8],
            delegNum: `${delegNum}`,
            receiver: toBech32Address(ssnArgs[9]),
        }

        yield put(UPDATE_OPERATOR_STATS({ operator_stats: operatorStats }));
    } catch (e) {
        console.warn("populate operator stats failed");
        yield put(UPDATE_OPERATOR_STATS({ operator_stats: initialOperatorStats }));
    } finally {
        yield put(UPDATE_FETCH_OPERATOR_STATS_STATUS(OperationStatus.COMPLETE));
    }
}

function* pollOperatorData() {
    yield fork(populateOperatorStats)
}

/**
 * reload user data when zilpay change account
 * stop the current poll and resume back later
 */
function* queryAndUpdateStats() {
    yield put(POLL_USER_DATA_STOP());
    yield put(UPDATE_FETCH_DELEG_STATS_STATUS(OperationStatus.PENDING));
    
    yield all([
        call(queryAndUpdateRole),
        call(queryAndUpdateBalance),
        call(queryAndUpdateGzil),
    ]);

    const { role } = yield select(getUserState);
    if (role === Role.OPERATOR) {
        yield call(pollOperatorData)
    } else {
        yield call(pollDelegatorData)
    }

    yield put(UPDATE_FETCH_DELEG_STATS_STATUS(OperationStatus.COMPLETE));
    // delay before start to poll again
    yield delay(REFRESH_INTERVAL);
    yield put(POLL_USER_DATA_START());
}

function* pollUserSaga() {
    while (true) {
        try {
            yield put(UPDATE_FETCH_DELEG_STATS_STATUS(OperationStatus.PENDING));

            const { role } = yield select(getUserState);
            if (role === Role.OPERATOR) {
                yield call(pollOperatorData)
            } else {
                yield call(pollDelegatorData)
            }
        } catch (e) {
            console.warn("poll user data failed");
        } finally {
            yield put(UPDATE_FETCH_DELEG_STATS_STATUS(OperationStatus.COMPLETE));
            yield delay(REFRESH_INTERVAL);
        }
    }
}

function* watchPollUserData() {
    while (true) {
        yield take(POLL_USER_DATA_START);
        yield race([
            call(pollUserSaga),
            take(POLL_USER_DATA_STOP),
        ]);
    }
}

function* userSaga() {
    yield take(INIT_USER)
    yield takeLatest(QUERY_AND_UPDATE_USER_STATS, queryAndUpdateStats)

    yield take([PRELOAD_INFO_READY, UPDATE_ROLE])
    yield fork(watchPollUserData)
}

export default userSaga;