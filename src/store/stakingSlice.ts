/**
 * stores info related to staking, e.g. contract states, staked amount
 */

import { createSlice } from '@reduxjs/toolkit'


export interface StakingState {
    total_stake_amount: string
}

const initialState: StakingState = {
    total_stake_amount: '',
}

const stakingSlice = createSlice({
    name: 'staking',
    initialState: initialState,
    reducers: {
        UPDATE_TOTAL_STAKE_AMOUNT(state, action) {
            const { total_stake_amount } = action.payload
            state.total_stake_amount = total_stake_amount
        },
    },
})

export const {
    UPDATE_TOTAL_STAKE_AMOUNT,
} = stakingSlice.actions

export default stakingSlice.reducer;