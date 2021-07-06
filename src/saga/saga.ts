import { call, delay, fork, put, race, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import * as ZilliqaAccount2 from "../account";
import { logger } from '../util/logger';
import { getBlockchain, getUserState } from './selectors';
import { BlockchainState, CONFIG_LOADED } from '../store/blockchainSlice';
import { UPDATE_FETCH_LANDING_STATS_STATUS, UPDATE_FETCH_SSN_STATS_STATUS, UPDATE_GZIL_ADDRESS, UPDATE_GZIL_TOTAL_SUPPLY, UPDATE_LANDING_STATS, UPDATE_MIN_DELEG, UPDATE_SSN_DROPDOWN_LIST, UPDATE_SSN_LIST, UPDATE_TOTAL_STAKE_AMOUNT } from '../store/stakingSlice';
import { INIT_USER, POLL_BALANCE, QUERY_AND_UPDATE_ROLE, UPDATE_BALANCE, UPDATE_ROLE } from '../store/userSlice';
import { RootState } from '../store/store';
import { Constants, OperationStatus, Role, SsnStatus } from '../util/enum';
import { LandingStats, NodeOptions, SsnStats } from '../util/interface';
import { toBech32Address } from '@zilliqa-js/crypto';
import { ZilAccount } from '../zilliqa';
import { convertZilToQa } from '../util/utils';
import BigNumber from 'bignumber.js';

const MAX_GZIL_SUPPLY = Constants.MAX_GZIL_SUPPLY.toString();
const TOTAL_REWARD_SEED_NODES = Constants.TOTAL_REWARD_SEED_NODES.toString(); // 110000 * 17

async function fetchContractState(contractAddress: string, field: string) {
    return await ZilliqaAccount2.getImplStateExplorerRetriable(contractAddress, field);
}

async function fetchUserBalance(address_bech32: string) {
    return await ZilliqaAccount2.getBalanceRetriable(address_bech32);
}

// everyone
// get account balance
// ssn stats

// operator
// getOperatorStats();

// delegator
// getDelegatorStats();
// getDelegatorPendingWithdrawal();
// getDelegatorSwapRequests();
// getBlockRewardCountDown();

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
 * fetch these data only once
 */
function* watchInitOnce() {
    try {
        yield put(UPDATE_FETCH_LANDING_STATS_STATUS(OperationStatus.PENDING));
        logger("fetching contract data (I) once...");
        const { impl } = yield select(getBlockchain);
        const { mindelegstake } = yield call(ZilAccount.getImplStateRetriable, impl, 'mindelegstake');
        logger("mindelegstake: %o", mindelegstake);

        const { totalstakeamount } = yield call(ZilAccount.getImplStateRetriable, impl, 'totalstakeamount');
        logger("totalstakeamount: %o", totalstakeamount);

        const { gziladdr } = yield call(ZilAccount.getImplStateRetriable, impl, 'gziladdr');
        const { total_supply } = yield call(ZilAccount.getImplStateRetriable, gziladdr, 'total_supply');
        logger("gziladdr: ", gziladdr);
        logger("gzil minted: ", total_supply);

        // populate landing stats data
        const { last_withdraw_cycle_deleg } = yield call(ZilAccount.getImplStateRetriable, impl, 'last_withdraw_cycle_deleg');
        
        if (isRespOk(last_withdraw_cycle_deleg)) {
            const { comm_for_ssn } = yield call(ZilAccount.getImplStateRetriable, impl, 'comm_for_ssn');
            const nodesNum = isRespOk(comm_for_ssn) ? Object.keys(comm_for_ssn).length.toString() : '0';
            const delegNum = Object.keys(last_withdraw_cycle_deleg).length.toString();
            
            let circulatingSupplyStake = '0';
            const totalCoinSupply: string = yield call(ZilAccount.getTotalCoinSupply);
            if (isRespOk(totalCoinSupply)) {
                const totalCoinSupplyBN = new BigNumber(convertZilToQa(totalCoinSupply));
                circulatingSupplyStake = (new BigNumber(totalstakeamount).dividedBy(totalCoinSupplyBN)).times(100).toFixed(5);
            }

            // compute remaining gzil percentage
            const maxGzilSupply = new BigNumber(MAX_GZIL_SUPPLY).shiftedBy(15);
            const remainGzil = maxGzilSupply.minus(new BigNumber(total_supply));
            const remainingGzil = (remainGzil.dividedBy(maxGzilSupply)).times(100).toFixed(2);
            
            // compute est. APY
            const temp = new BigNumber(totalstakeamount);
            const estAPY = new BigNumber(convertZilToQa(TOTAL_REWARD_SEED_NODES)).dividedBy(temp).times(36500).toFixed(2);

            const landingStats: LandingStats = {
                circulatingSupplyStake: circulatingSupplyStake,
                nodesNum: nodesNum,
                delegNum: delegNum,
                gzil: total_supply,
                remainingGzil: remainingGzil,
                totalDeposits: totalstakeamount,
                estRealtimeAPY: estAPY,
            }
            logger("landing stats: ", landingStats);
            yield put(UPDATE_LANDING_STATS({ landing_stats: landingStats }));
        }

        yield put(UPDATE_MIN_DELEG({ min_deleg_stake: mindelegstake }));
        yield put(UPDATE_TOTAL_STAKE_AMOUNT({ total_stake_amount: totalstakeamount }));
        yield put(UPDATE_GZIL_ADDRESS({ gzil_address: gziladdr }));
        yield put(UPDATE_GZIL_TOTAL_SUPPLY({ gzil_total_supply: total_supply }));
        yield put(UPDATE_FETCH_LANDING_STATS_STATUS(OperationStatus.COMPLETE));
    } catch (e) {
        console.warn("fetch home data failed");
        console.warn(e);
    }
}

/**
 * continuously poll these data
 */
function* watchInitLoop() {
    while (true) {
        try {
            yield put(UPDATE_FETCH_SSN_STATS_STATUS(OperationStatus.PENDING));
            logger("fetching contract data (II) poll...");
            const { impl } = yield select(getBlockchain);

            const { ssnlist } = yield call(ZilAccount.getImplStateRetriable, impl, 'ssnlist');
            const { ssn_deleg_amt } = yield call(ZilAccount.getImplStateRetriable, impl, 'ssn_deleg_amt');

            logger("ssnlist: ", ssnlist);
            logger("ssn_deleg_amt: ", ssn_deleg_amt);

            let dropdown_list: NodeOptions[] = [];
            let ssn_list: SsnStats[] = [];
            for (const ssnAddress in ssnlist) {
                const ssnArgs = ssnlist[ssnAddress]['arguments'];
                const status = (ssnArgs[0]['constructor'] === 'True') ? SsnStatus.ACTIVE : SsnStatus.INACTIVE;
                const delegNum = Object.keys(ssn_deleg_amt[ssnAddress]).length.toString()

                // for ssn table
                const ssnStats: SsnStats = {
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

                // for use as dropdown options in the modals
                const dropdownOptions: NodeOptions = {
                    address: toBech32Address(ssnAddress),
                    name: ssnArgs[3],
                    stakeAmt: ssnArgs[1],
                    delegNum: delegNum,
                    commRate: ssnArgs[7],
                }

                ssn_list.push(ssnStats);
                dropdown_list.push(dropdownOptions);
            }

            // yield put(UPDATE_TOTAL_STAKE_AMOUNT({ total_stake_amount: totalstakeamount }));
            yield put(UPDATE_SSN_DROPDOWN_LIST({ dropdown_list: dropdown_list }));
            yield put(UPDATE_SSN_LIST({ ssn_list: ssn_list }));
            yield put(UPDATE_FETCH_SSN_STATS_STATUS(OperationStatus.COMPLETE));
        } catch (e) {
            console.warn("fetch failed");
            console.warn(e);
        } finally {
            // TODO: should be race
            yield delay(10000);
        }
    }
}

function* pollBalance() {
        try {
            logger("fetch user balance...");
            const { address_bech32 } = yield select(getUserState)
            logger("address: %o", address_bech32);
            const balance: string = yield call(fetchUserBalance, address_bech32);
            logger("balance: %o", balance);

            yield put(UPDATE_BALANCE({ balance: balance }));
        } catch (e) {
            console.warn("fetch failed");
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

function* pollOperatorData() {
    logger("polling operator data")
}

function* pollDelegatorData() {
    logger("polling user data")
}

function* watchPollUserData() {
    while (true) {
        try {
            const { role } = yield select(getUserState);
            if (role === Role.OPERATOR) {
                yield call(pollOperatorData);
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

function* mySaga() {
    yield take(CONFIG_LOADED) // wait for app to load details from config
    yield fork(watchInitOnce)
    yield fork(watchInitLoop)
    // yield takeLatest(QUERY_AND_UPDATE_ROLE, queryAndUpdateRole)
    // yield take(INIT_USER)
    // yield fork(watchPollUserData)
    // yield takeEvery(POLL_BALANCE, pollBalance)
}

export default mySaga;