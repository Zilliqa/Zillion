import { call, delay, fork, put, race, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import * as ZilliqaAccount from "../account";
import * as types from '../store/actionTypes';
import { logger } from '../util/logger';
import { getBlockchain } from './selectors';
import { BlockchainState, CONFIG_LOADED } from '../store/blockchainSlice';
import { UPDATE_TOTAL_STAKE_AMOUNT } from '../store/stakingSlice';

async function fetchContractState(contractAddress: string, field: string) {
    return await ZilliqaAccount.getImplStateExplorerRetriable(contractAddress, field);
}

function* watchInit() {
    while (true) {
        try {
            logger("saga running...");
            // call zilliqa to fetch total stake amount
            // and save in store
            const { impl } = yield select(getBlockchain);
            const { totalstakeamount } = yield call(fetchContractState, impl, 'totalstakeamount');
            logger("totalstakeamount: %o", totalstakeamount);
            yield put(UPDATE_TOTAL_STAKE_AMOUNT({ total_stake_amount: totalstakeamount }));
        } catch (e) {
            console.warn("fetch failed");
            console.warn(e);
        } finally {
            // should be race
            yield delay(10000);
        }
    }
}

function* mySaga() {
    yield take(CONFIG_LOADED) // wait for app to load details from config
    yield fork(watchInit)
}

export default mySaga;