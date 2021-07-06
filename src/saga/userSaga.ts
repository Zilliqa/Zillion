import { Task } from 'redux-saga';
import { call, cancel, delay, fork, put, race, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import { QUERY_AND_UPDATE_ROLE, INIT_USER, UPDATE_ROLE, UPDATE_BALANCE, QUERY_AND_UPDATE_BALANCE } from '../store/userSlice';
import { Role } from '../util/enum';
import { logger } from '../util/logger';
import { ZilAccount } from '../zilliqa';
import { getUserState, getBlockchain } from './selectors';


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

function* watchPollUserData() {
    while (true) {
        try {
            const { role } = yield select(getUserState);
            if (role === Role.OPERATOR) {
                // yield call(pollOperatorData);
            } else {
                // yield call(pollDelegatorData);
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
    yield fork(watchPollUserData)
}

export default userSaga;