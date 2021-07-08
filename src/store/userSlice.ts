import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { AccountType, LedgerIndex, OperationStatus, Role } from '../util/enum'
import * as ZilliqaAccount from "../account";
import { initialOperatorStats, initialSwapDelegModalData, OperatorStats, PendingWithdrawStats, SwapDelegModalData } from '../util/interface';

interface UserState {
    address_bech32: string,
    address_base16: string,
    account_type: AccountType,
    authenticated: boolean,
    balance: string,                                    // zils in Qa
    gzil_balance: string,
    complete_withdrawal_amt: string,                    // amount that is allowed to complete withdraw
    ledger_index: number,
    role: Role,                                         // actual role
    selected_role: Role,                                // role that the user selects when signing in
    operator_stats: OperatorStats                       // track the operator stats, if user is an operator
    pending_withdraw_list: PendingWithdrawStats[]       // track pending withdrawals
    swap_deleg_modal_data: SwapDelegModalData,          // hold delegator swap request
    is_operator_stats_loading: OperationStatus          // status indicator for loading operator stats
}

const initialState: UserState = {
    address_bech32: '',
    address_base16: '',
    account_type: AccountType.NONE,
    authenticated: false,
    balance: '0',
    gzil_balance: '0',
    complete_withdrawal_amt: '0',
    ledger_index: LedgerIndex.DEFAULT,
    role: Role.NONE,
    operator_stats: initialOperatorStats,
    selected_role: Role.NONE,
    pending_withdraw_list: [],
    swap_deleg_modal_data: initialSwapDelegModalData,
    is_operator_stats_loading: OperationStatus.IDLE,
}

export const fetchBalance = createAsyncThunk('user/fetchBalance', async (address: string) => {
    const response = await ZilliqaAccount.getBalanceRetriable(address);
    return response;
})

/**
 * stores user's wallet information
 */
const userSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {
        INIT_USER(state, action) {
            const { address_base16, address_bech32, account_type, authenticated, selected_role } = action.payload
            state.address_base16 = address_base16.toLowerCase()
            state.address_bech32 = address_bech32.toLowerCase()
            state.account_type = account_type
            state.authenticated = authenticated
            state.selected_role = selected_role
        },
        QUERY_AND_UPDATE_BALANCE() {},
        QUERY_AND_UPDATE_GZIL_BALANCE() {},
        QUERY_AND_UPDATE_ROLE() {},
        QUERY_AND_UPDATE_DELEGATOR_STATS() {},
        QUERY_AND_UPDATE_OPERATOR_STATS() {}, 
        QUERY_AND_UPDATE_USER_STATS() {},
        POLL_BALANCE() {},
        POLL_USER_DATA_START() {},
        POLL_USER_DATA_STOP() {},
        UPDATE_ADDRESS(state, action) {
            const { address_base16, address_bech32 } = action.payload
            state.address_base16 = address_base16.toLowerCase()
            state.address_bech32 = address_bech32.toLowerCase()
        },
        UPDATE_BALANCE(state, action) {
            const { balance } = action.payload
            state.balance = balance
        },
        UPDATE_COMPLETE_WITHDRAWAL_AMT(state, action) {
            const { complete_withdrawal_amt } = action.payload
            state.complete_withdrawal_amt = complete_withdrawal_amt
        },
        UPDATE_GZIL_BALANCE(state, action) {
            const { gzil_balance } = action.payload
            state.gzil_balance = gzil_balance
        },
        UPDATE_LEDGER_INDEX(state, action) {
            const { ledger_index } = action.payload
            state.ledger_index = ledger_index
        },
        UPDATE_OPERATOR_STATS(state, action) {
            const { operator_stats } = action.payload
            state.operator_stats = operator_stats
        },
        UPDATE_PENDING_WITHDRAWAL_LIST(state, action) {
            const { pending_withdraw_list } = action.payload
            state.pending_withdraw_list = pending_withdraw_list
        },
        UPDATE_ROLE(state, action) {
            const { role } = action.payload
            state.role = role
        },
        UPDATE_SWAP_DELEG_MODAL(state, action) {
            const { swap_deleg_modal } = action.payload
            state.swap_deleg_modal_data = swap_deleg_modal
        },
        UPDATE_FETCH_OPERATOR_STATS_STATUS(state, action) {
            state.is_operator_stats_loading = action.payload
        },
        RESET_USER_STATE(state) {
            state.address_bech32 = initialState.address_bech32
            state.address_base16 = initialState.address_base16
            state.account_type = initialState.account_type
            state.authenticated = initialState.authenticated
            state.balance = initialState.balance
            state.gzil_balance = initialState.gzil_balance
            state.complete_withdrawal_amt = initialState.complete_withdrawal_amt
            state.ledger_index = initialState.ledger_index
            state.role = initialState.role
            state.operator_stats = initialState.operator_stats
            state.pending_withdraw_list = initialState.pending_withdraw_list
            state.swap_deleg_modal_data = initialState.swap_deleg_modal_data
            state.is_operator_stats_loading = initialState.is_operator_stats_loading
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchBalance.fulfilled, (state, { payload } ) => {
            state.balance = payload
        })
    },
})

export const {
    INIT_USER,
    QUERY_AND_UPDATE_BALANCE,
    QUERY_AND_UPDATE_GZIL_BALANCE,
    QUERY_AND_UPDATE_ROLE,
    QUERY_AND_UPDATE_DELEGATOR_STATS,
    QUERY_AND_UPDATE_OPERATOR_STATS,
    QUERY_AND_UPDATE_USER_STATS,
    POLL_BALANCE,
    POLL_USER_DATA_START,
    POLL_USER_DATA_STOP,
    UPDATE_ADDRESS,
    UPDATE_BALANCE,
    UPDATE_COMPLETE_WITHDRAWAL_AMT,
    UPDATE_GZIL_BALANCE,
    UPDATE_LEDGER_INDEX,
    UPDATE_OPERATOR_STATS,
    UPDATE_PENDING_WITHDRAWAL_LIST,
    UPDATE_ROLE,
    UPDATE_SWAP_DELEG_MODAL,
    UPDATE_FETCH_OPERATOR_STATS_STATUS,
    RESET_USER_STATE,
} = userSlice.actions

export default userSlice.reducer;