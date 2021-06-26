import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { AccountType, LedgerIndex, Role } from '../util/enum'

interface UserState {
    address_bech32: string,
    address_base16: string,
    account_type: AccountType,
    authenticated: boolean,
    balance: string, // zils in Qa
    ledger_index: number,
    role: Role,
}

const initialState: UserState = {
    address_bech32: '',
    address_base16: '',
    account_type: AccountType.NONE,
    authenticated: false,
    balance: '0',
    ledger_index: LedgerIndex.DEFAULT,
    role: Role.NONE,
}

export const fetchBalance = createAsyncThunk('user/fetchBalance', async () => {
    // fetch from zil account?
})

/**
 * stores user's wallet information
 */
const userSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {
        initUser(state, action) {
            const { address_base16, address_bech32, account_type, authenticated } = action.payload
            state.address_base16 = address_base16.toLowerCase()
            state.address_bech32 = address_bech32.toLowerCase()
            state.account_type = account_type
            state.authenticated = authenticated
        },
        updateAddress(state, action) {
            const { address_base16, address_bech32 } = action.payload
            state.address_base16 = address_base16.toLowerCase()
            state.address_bech32 = address_bech32.toLowerCase()
        },
        updateBalance(state, action) {
            const { balance } = action.payload
            state.balance = balance
        },
        updateLedgerIndex(state, action) {
            const { ledger_index } = action.payload
            state.ledger_index = ledger_index
        },
        reset(state) {
            state = initialState
        },
    },
    extraReducers: (builder) => {
        // builder.addCase(fetchBalance.fulfilled, (state, { payload }) => {
        //     state.balance = payload
        // })
    },
})

export const {
    initUser,
    updateAddress,
    updateBalance,
    updateLedgerIndex,
    reset,
} = userSlice.actions

export default userSlice.reducer;