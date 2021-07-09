import { call, delay, fork, put, race, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import { logger } from '../util/logger';
import { getBlockchain, getUserState } from './selectors';
import { BlockchainState, CONFIG_LOADED } from '../store/blockchainSlice';
import { POLL_STAKING_DATA_START, POLL_STAKING_DATA_STOP, PRELOAD_INFO_READY, QUERY_AND_UPDATE_STAKING_STATS, UPDATE_FETCH_LANDING_STATS_STATUS, UPDATE_FETCH_SSN_STATS_STATUS, UPDATE_GZIL_ADDRESS, UPDATE_GZIL_TOTAL_SUPPLY, UPDATE_LANDING_STATS, UPDATE_MIN_BNUM_REQ, UPDATE_MIN_DELEG, UPDATE_REWARD_BLK_COUNTDOWN, UPDATE_SSN_DROPDOWN_LIST, UPDATE_SSN_LIST, UPDATE_TOTAL_STAKE_AMOUNT } from '../store/stakingSlice';
import { INIT_USER, QUERY_AND_UPDATE_ROLE, UPDATE_BALANCE, UPDATE_ROLE } from '../store/userSlice';
import { Constants, OperationStatus, Role, SsnStatus } from '../util/enum';
import { LandingStats, NodeOptions, SsnStats } from '../util/interface';
import { toBech32Address } from '@zilliqa-js/crypto';
import { ZilSdk } from '../zilliqa-api';
import { calculateBlockRewardCountdown, convertZilToQa } from '../util/utils';
import BigNumber from 'bignumber.js';

const MAX_GZIL_SUPPLY = Constants.MAX_GZIL_SUPPLY.toString();
const TOTAL_REWARD_SEED_NODES = Constants.TOTAL_REWARD_SEED_NODES.toString(); // 110000 * 17


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
        const { mindelegstake } = yield call(ZilSdk.getSmartContractSubState, impl, 'mindelegstake');
        logger("mindelegstake: %o", mindelegstake);

        const { totalstakeamount } = yield call(ZilSdk.getSmartContractSubState, impl, 'totalstakeamount');
        logger("totalstakeamount: %o", totalstakeamount);

        const { bnum_req } = yield call(ZilSdk.getSmartContractSubState, impl, 'bnum_req');
        logger("bnum req: ", bnum_req);

        const { gziladdr } = yield call(ZilSdk.getSmartContractSubState, impl, 'gziladdr');
        const { total_supply } = yield call(ZilSdk.getSmartContractSubState, gziladdr, 'total_supply');
        logger("gziladdr: ", gziladdr);
        logger("gzil minted: ", total_supply);

        // populate landing stats data
        const { last_withdraw_cycle_deleg } = yield call(ZilSdk.getSmartContractSubState, impl, 'last_withdraw_cycle_deleg');
        
        if (isRespOk(last_withdraw_cycle_deleg)) {
            const { comm_for_ssn } = yield call(ZilSdk.getSmartContractSubState, impl, 'comm_for_ssn');
            const nodesNum = isRespOk(comm_for_ssn) ? Object.keys(comm_for_ssn).length.toString() : '0';
            const delegNum = Object.keys(last_withdraw_cycle_deleg).length.toString();
            
            let circulatingSupplyStake = '0';
            const totalCoinSupply: string = yield call(ZilSdk.getTotalCoinSupply);
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

        yield put(UPDATE_MIN_BNUM_REQ({ min_bnum_req: bnum_req }));
        yield put(UPDATE_MIN_DELEG({ min_deleg_stake: mindelegstake }));
        yield put(UPDATE_TOTAL_STAKE_AMOUNT({ total_stake_amount: totalstakeamount }));
        yield put(UPDATE_GZIL_ADDRESS({ gzil_address: gziladdr }));
        yield put(UPDATE_GZIL_TOTAL_SUPPLY({ gzil_total_supply: total_supply }));

    } catch (e) {
        console.warn("fetch home data failed");
        console.warn(e);

    } finally {
        yield put(UPDATE_FETCH_LANDING_STATS_STATUS(OperationStatus.COMPLETE));
        yield put(PRELOAD_INFO_READY()); // inform other saga that preloaded info is in store
    }
}

function* pollStakingData() {
    try {
        yield put(UPDATE_FETCH_SSN_STATS_STATUS(OperationStatus.PENDING));
        logger("fetching staking data...");
        const { impl, blockchain } = yield select(getBlockchain);

        const { ssnlist } = yield call(ZilSdk.getSmartContractSubState, impl, 'ssnlist');
        const { ssn_deleg_amt } = yield call(ZilSdk.getSmartContractSubState, impl, 'ssn_deleg_amt');

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

        // populate number of blocks before rewards are issued
        // for deleg stats
        let rewardBlkCountdown = 0;
        const numTxBlk: string = yield call(ZilSdk.getNumTxBlocks);

        if (isRespOk(numTxBlk)) {
            const currBlkNum = parseInt(numTxBlk) - 1;
            rewardBlkCountdown = yield call(calculateBlockRewardCountdown, currBlkNum, blockchain)
        }

        // yield put(UPDATE_TOTAL_STAKE_AMOUNT({ total_stake_amount: totalstakeamount }));
        yield put(UPDATE_SSN_DROPDOWN_LIST({ dropdown_list: dropdown_list }));
        yield put(UPDATE_SSN_LIST({ ssn_list: ssn_list }));
        yield put(UPDATE_REWARD_BLK_COUNTDOWN({ reward_blk_countdown: `${rewardBlkCountdown}` }))
    } catch (e) {
        console.warn("fetch failed");
        console.warn(e);
        yield put(UPDATE_SSN_DROPDOWN_LIST({ dropdown_list: [] }));
        yield put(UPDATE_SSN_LIST({ ssn_list: [] }));
        yield put(UPDATE_REWARD_BLK_COUNTDOWN({ reward_blk_countdown: "0" }))
    } finally {
        yield put(UPDATE_FETCH_SSN_STATS_STATUS(OperationStatus.COMPLETE));
    }
}

/**
 * reload user data when zilpay change network
 * stop the current poll and resume later
 */
function* queryAndUpdateStats() {
    yield put(POLL_STAKING_DATA_STOP());
    yield call(pollStakingData);

    // delay before start to poll again
    yield delay(30000);
    yield put(POLL_STAKING_DATA_START());
}

function* pollStakingSaga() {
    while (true) {
        try {
            yield call(pollStakingData);
        } catch (e) {
            console.warn("poll staking data failed");
            console.warn(e);
        } finally {
            yield delay(30000);
        }
    }
}

function* watchPollStakingData() {
    while (true) {
        yield take(POLL_STAKING_DATA_START);
        yield race([
            call(pollStakingSaga),
            take(POLL_STAKING_DATA_STOP),
        ])
    }
}

function* stakingSaga() {
    yield take(CONFIG_LOADED) // wait for app to load details from config
    yield fork(watchInitOnce)
    
    yield fork(watchPollStakingData)
    yield takeLatest(QUERY_AND_UPDATE_STAKING_STATS, queryAndUpdateStats)
}

export default stakingSaga;