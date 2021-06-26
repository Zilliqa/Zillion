import { createSlice } from '@reduxjs/toolkit'
import { Role } from '../util/enum'

interface UserState {
    address_bech32: string,
    address_base16: string,
    authenticated: boolean,
    role: Role,
}

const initialState: UserState = {
    address_bech32: '',
    address_base16: '',
    authenticated: false,
    role: Role.NONE,
}

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
        reset(state) {
            state = initialState
        },
    },
})

export const {
    initUser,
} = userSlice.actions

export default userSlice.reducer;