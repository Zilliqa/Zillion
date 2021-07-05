import { call, delay, fork, put, race, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import { CONFIG_LOADED } from '../store/blockchainSlice';
import { UPDATE_MIN_DELEG, UPDATE_GZIL_ADDRESS, UPDATE_GZIL_TOTAL_SUPPLY } from '../store/stakingSlice';
import { logger } from '../util/logger';
import { getBlockchain } from './selectors';
import * as ZilliqaAccount from "../account";

async function fetchContractState(contractAddress: string, field: string) {
    return await ZilliqaAccount.getImplStateExplorerRetriable(contractAddress, field);
}

/**
 * fetch these data only once
 */
 function* watchInitOnce() {
    try {
        logger("fetching contract data (I) once...");
        const { impl } = yield select(getBlockchain);
        const { mindelegstake } = yield call(fetchContractState, impl, 'mindelegstake');
        logger("mindelegstake: %o", mindelegstake);

        const { gziladdr } = yield call(fetchContractState, impl, 'gziladdr');
        const { total_supply } = yield call(fetchContractState, gziladdr, 'total_supply');
        logger("gziladdr: ", gziladdr);
        logger("gzil minted: ", total_supply);

        const { totalstakeamount } = yield call(fetchContractState, impl, 'totalstakeamount');
        logger("totalstakeamount: %o", totalstakeamount);

        yield put(UPDATE_MIN_DELEG({ min_deleg_stake: mindelegstake }));
        yield put(UPDATE_GZIL_ADDRESS({ gzil_address: gziladdr }));
        yield put(UPDATE_GZIL_TOTAL_SUPPLY({ gzil_total_supply: total_supply }));
    } catch (e) {
        console.warn("fetch failed");
        console.warn(e);
    }
}

function* preloadSaga() {
    yield take(CONFIG_LOADED) // wait for app to load details from config
    yield fork(watchInitOnce)
}
export default preloadSaga;