import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import BigNumber from 'bignumber.js'
import { Role } from '../util/enum'

interface UserState {
    address_bech32: string,
    address_base16: string,
    authenticated: boolean,
    balance: BigNumber, // zils in Qa
    role: Role,
}

const initialState: UserState = {
    address_bech32: '',
    address_base16: '',
    authenticated: false,
    balance: new BigNumber(0),
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
            const { address_base16, address_bech32, authenticated } = action.payload
            state.address_base16 = address_base16.toLowerCase()
            state.address_bech32 = address_bech32.toLowerCase()
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
    reset,
} = userSlice.actions

export default userSlice.reducer;