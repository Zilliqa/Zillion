import { call, delay, fork, put, race, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import * as ZilliqaAccount from "../account";
import { logger } from '../util/logger';
import { getBlockchain, getUserState } from './selectors';
import { BlockchainState, CONFIG_LOADED } from '../store/blockchainSlice';
import { UPDATE_MIN_DELEG, UPDATE_SSN_DROPDOWN_LIST, UPDATE_SSN_LIST, UPDATE_TOTAL_STAKE_AMOUNT } from '../store/stakingSlice';
import { POLL_BALANCE, UPDATE_BALANCE } from '../store/userSlice';
import { RootState } from '../store/store';
import { SsnStatus } from '../util/enum';
import { NodeOptions, SsnStats } from '../util/interface';
import { toBech32Address } from '@zilliqa-js/crypto';

async function fetchContractState(contractAddress: string, field: string) {
    return await ZilliqaAccount.getImplStateExplorerRetriable(contractAddress, field);
}

async function fetchUserBalance(address_bech32: string) {
    return await ZilliqaAccount.getBalanceRetriable(address_bech32);
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


function* watchInitLoop() {
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

            const { ssnlist } = yield call(fetchContractState, impl, 'ssnlist');
            const { ssn_deleg_amt } = yield call(fetchContractState, impl, 'ssn_deleg_amt');

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

            yield put(UPDATE_MIN_DELEG({ min_deleg_stake: mindelegstake }));
            yield put(UPDATE_TOTAL_STAKE_AMOUNT({ total_stake_amount: totalstakeamount }));
            yield put(UPDATE_SSN_DROPDOWN_LIST({ dropdown_list: dropdown_list }));
            yield put(UPDATE_SSN_LIST({ ssn_list: ssn_list }));
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

function* mySaga() {
    yield take(CONFIG_LOADED) // wait for app to load details from config
    yield fork(watchInitLoop)
    yield takeEvery(POLL_BALANCE, pollBalance)
}

export default mySaga;