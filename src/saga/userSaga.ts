import { toBech32Address } from '@zilliqa-js/zilliqa';
import { BigNumber } from 'bignumber.js';
import { Task } from 'redux-saga';
import { call, cancel, delay, fork, put, race, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import { UPDATE_DELEG_PORTFOLIO, UPDATE_DELEG_STATS, UPDATE_FETCH_DELEG_STATS_STATUS } from '../store/stakingSlice';
import { QUERY_AND_UPDATE_ROLE, INIT_USER, UPDATE_ROLE, UPDATE_BALANCE, QUERY_AND_UPDATE_BALANCE, QUERY_AND_UPDATE_GZIL_BALANCE, UPDATE_GZIL_BALANCE, UPDATE_SWAP_DELEG_MODAL, UPDATE_PENDING_WITHDRAWAL_LIST } from '../store/userSlice';
import { OperationStatus, Role } from '../util/enum';
import { DelegStakingPortfolioStats, DelegStats, LandingStats, PendingWithdrawStats, SsnStats, SwapDelegModalData } from '../util/interface';
import { logger } from '../util/logger';
import { computeDelegRewards } from '../util/reward-calculator';
import { ZilAccount } from '../zilliqa';
import { getUserState, getBlockchain, getStakingState } from './selectors';


/**
 * used to check if response from fetching a contract state has any errors
 * @param obj the contract result
 * @returns true if response has no errors, false otherwise
 */
 function isRespOk(obj: any): boolean {
    if (
        obj !== undefined &&
        obj !== null &&
        obj !== OperationStatus.ERROR
    ) {
        return true;
    }
    return false;
}

/**
 * query the connected wallet's balance and update the balance in the store
 */
function* queryAndUpdateBalance() {
    logger("check balance");
    try {
        const { address_base16 } = yield select(getUserState);
        const balance: string = yield call(ZilAccount.getBalance, address_base16);
        logger("user balance: ", balance);
        yield put(UPDATE_BALANCE({ balance: balance }));
    } catch (e) {
        console.warn("query and update balance failed");
        console.warn(e);
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
        const isOperator: boolean = yield call(ZilAccount.isOperator, impl, address_base16);

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
        const { address_base16 } = yield select(getUserState);
        const { gzil_address } = yield select(getStakingState);

        const response: Object = yield call(ZilAccount.getImplStateRetriable, gzil_address, 'balances', [address_base16]);
        logger("gzil response: ", response);

        if (isRespOk(response)) {
            yield put(UPDATE_GZIL_BALANCE({ gzil_balance: (response as any)['balanaces'][address_base16] }));
        }
    } catch (e) {
        console.warn("query and update gzil failed");
        console.warn(e);
    }
}

/**
 * populate delegator staking portfolio and delegator stats
 * @returns 
 */
function* populateStakingPortfolio() {
    logger("populate staking portfolio");
    try {
        yield put(UPDATE_FETCH_DELEG_STATS_STATUS(OperationStatus.PENDING));

        const { address_base16, gzil_balance } = yield select(getUserState);
        const { impl } = yield select(getBlockchain);
        const response: Object = yield call(ZilAccount.getImplStateRetriable, impl, 'deposit_amt_deleg', [address_base16]);
        logger("deposit deleg list: ", response);

        if (!isRespOk(response)) {
            // user has no stake
            return;
        }

        const { landing_stats, ssn_list } = yield select(getStakingState);
        const depositAmtDeleg = (response as any)['deposit_amt_deleg'][address_base16];
        let staking_portfolio_list: DelegStakingPortfolioStats[] = [];
        let totalDeposits = new BigNumber(0);
        let totalRewards = new BigNumber(0);
        
        for (const ssnAddress in depositAmtDeleg) {
            // compute total deposits
            const deposit = new BigNumber(depositAmtDeleg[ssnAddress]);
            totalDeposits = totalDeposits.plus(deposit);

            // compute zil rewards
            const rewards = new BigNumber(yield call(computeDelegRewards, impl, ssnAddress, address_base16));
            totalRewards = totalRewards.plus(rewards);

            const ssnAddressBech32 = toBech32Address(ssnAddress);
            const stakingStats: DelegStakingPortfolioStats = {
                ssnName: (ssn_list as SsnStats[]).find(ssn => ssn.address === ssnAddressBech32)?.name || '',
                ssnAddress: ssnAddressBech32,
                delegAmt: `${deposit}`,
                rewards: `${rewards}`,
            }
            staking_portfolio_list.push(stakingStats);
        }

        const delegStats: DelegStats = {
            globalAPY: (landing_stats as LandingStats).estRealtimeAPY,
            gzilBalance: gzil_balance,
            gzilRewards: `${totalRewards}`,
            zilRewards: `${totalRewards}`,
            totalDeposits: `${totalDeposits}`
        }

        yield put(UPDATE_DELEG_STATS({ deleg_stats: delegStats }));
        yield put(UPDATE_DELEG_PORTFOLIO({ portfolio_list: staking_portfolio_list }));
        yield put(UPDATE_FETCH_DELEG_STATS_STATUS(OperationStatus.COMPLETE));
    } catch (e) {
        console.warn("populate staking portfolio failed");
        console.warn(e);
    }
}

/**
 * popoulate swap deleg requests
 */
function* populateSwapRequests() {
    logger("populate swap requests");
    try {
        const { address_base16 } = yield select(getUserState);
        const { impl } = yield select(getBlockchain);
        const { deleg_swap_request } = yield call(ZilAccount.getImplStateRetriable, impl, 'deleg_swap_request');

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
    }
}

function* populatePendingWithdrawal() {
    logger("popoulate pending withdrawal");
    try {
        const { address_base16 } = yield select(getUserState);
        const { impl } = yield select(getBlockchain);
        const response: Object = yield call(ZilAccount.getImplStateRetriable, impl, 'withdrawal_pending', [address_base16]);

        logger("pending withdrawal: ", response);

        if (!isRespOk(response)) {
            return;
        }

        let progress = '0';
        let pendingWithdrawList: PendingWithdrawStats[] = [];
        const pendingWithdrawal = (response as any)['withdrawal_pending'][address_base16];
        const { min_bnum_req } = yield select(getStakingState);
        const numTxBlk: string = yield call(ZilAccount.getNumTxBlocks);
        const currBlkNum = isRespOk(numTxBlk) ? new BigNumber(numTxBlk).minus(1) : new BigNumber(0);

        logger("asdasd", pendingWithdrawal);

        for (const blkNum in pendingWithdrawal) {
            // compute each pending stake withdrawal progress
            let pendingAmt = new BigNumber(pendingWithdrawal[blkNum]);
            let blkNumCheck = new BigNumber(blkNum).plus(min_bnum_req);
            let blkNumCountdown = blkNumCheck.minus(currBlkNum); // may be negative
            let completed = new BigNumber(0);

            // compute progress using blk num countdown ratio
            if (blkNumCountdown.isLessThanOrEqualTo(0)) {
                // can withdraw
                // totalClaimableAmtBN = totalClaimableAmtBN.plus(pendingAmt);
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
    } catch (e) {
        console.warn("populate pending withdrawal failed");
        console.warn(e);
    }
}

function* pollDelegatorData() {
    yield fork(populateStakingPortfolio)
    yield fork(populateSwapRequests)
    yield fork(populatePendingWithdrawal)
}

function* watchPollUserData() {
    while (true) {
        try {
            const { role } = yield select(getUserState);
            if (role === Role.OPERATOR) {
                // yield call(pollOperatorData);
            } else {
                yield call(pollDelegatorData);
            }
        } catch (e) {
            console.warn("poll user data failed");
            console.warn(e);
        } finally {
            yield delay(10000);
        }
    }

}

function* userSaga() {
    yield take(INIT_USER)
    yield takeLatest(QUERY_AND_UPDATE_ROLE, queryAndUpdateRole)
    yield takeLatest(QUERY_AND_UPDATE_BALANCE, queryAndUpdateBalance)
    yield takeLatest(QUERY_AND_UPDATE_GZIL_BALANCE, queryAndUpdateGzil)
    yield fork(watchPollUserData)
}

export default userSaga;