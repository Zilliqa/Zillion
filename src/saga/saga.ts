import { call, delay, fork, put, race, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import * as ZilliqaAccount from "../account";
import { logger } from '../util/logger';
import { getBlockchain, getUserState } from './selectors';
import { BlockchainState, CONFIG_LOADED } from '../store/blockchainSlice';
import { UPDATE_MIN_DELEG, UPDATE_TOTAL_STAKE_AMOUNT } from '../store/stakingSlice';
import { POLL_BALANCE, UPDATE_BALANCE } from '../store/userSlice';

async function fetchContractState(contractAddress: string, field: string) {
    return await ZilliqaAccount.getImplStateExplorerRetriable(contractAddress, field);
}

async function fetchUserBalance(address_bech32: string) {
    return await ZilliqaAccount.getBalanceRetriable(address_bech32);
}

function* watchInit() {
    while (true) {
        try {
            logger("saga running...");
            // call zilliqa to fetch total stake amount
            // and save in store
            const { impl } = yield select(getBlockchain);
            const { mindelegstake } = yield call(fetchContractState, impl, 'mindelegstake');
            const { totalstakeamount } = yield call(fetchContractState, impl, 'totalstakeamount');
            logger("mindelegstake: %o", mindelegstake);
            logger("totalstakeamount: %o", totalstakeamount);

            yield put(UPDATE_MIN_DELEG({ min_deleg_stake: mindelegstake }));
            yield put(UPDATE_TOTAL_STAKE_AMOUNT({ total_stake_amount: totalstakeamount }));
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
            const { balance } = yield call(fetchUserBalance, address_bech32);
            logger("balance: %o", balance);

            yield put(UPDATE_BALANCE({ balance: balance }));
        } catch (e) {
            console.warn("fetch failed");
            console.warn(e);
        } 
}

function* mySaga() {
    yield take(CONFIG_LOADED) // wait for app to load details from config
    yield fork(watchInit)
}

export default mySaga;