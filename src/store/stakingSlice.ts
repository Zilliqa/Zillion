/**
 * stores info related to staking, e.g. contract states, staked amount
 */

import { createSlice } from '@reduxjs/toolkit'


export interface StakingState {
    min_deleg_stake: string,          // min amount to deleg in Qa
    total_stake_amount: string  // sum of all stakes in contract Qa
}

const initialState: StakingState = {
    min_deleg_stake: '0',
    total_stake_amount: '0',
}

const stakingSlice = createSlice({
    name: 'staking',
    initialState: initialState,
    reducers: {
        UPDATE_MIN_DELEG(state, action) {
            const { min_deleg_stake } = action.payload
            state.min_deleg_stake = min_deleg_stake
        },
        UPDATE_TOTAL_STAKE_AMOUNT(state, action) {
            const { total_stake_amount } = action.payload
            state.total_stake_amount = total_stake_amount
        },
    },
})

export const {
    UPDATE_MIN_DELEG,
    UPDATE_TOTAL_STAKE_AMOUNT,
} = stakingSlice.actions

export default stakingSlice.reducer;