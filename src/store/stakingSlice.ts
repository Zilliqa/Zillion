/**
 * stores info related to staking, e.g. contract states, staked amount
 */

import { createSlice } from '@reduxjs/toolkit'
import { NodeOptions, SsnStats } from '../util/interface'


export interface StakingState {
    min_deleg_stake: string,                    // min amount to deleg in Qa
    total_stake_amount: string                  // sum of all stakes in contract Qa
    ssn_dropdown_list: NodeOptions[]   // to display ssn list as dropdown options in redeleg modal
    ssn_list: SsnStats[]                       // hold all the list of ssn info
}

const initialState: StakingState = {
    min_deleg_stake: '0',
    total_stake_amount: '0',
    ssn_dropdown_list: [],
    ssn_list: []
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
        UPDATE_SSN_DROPDOWN_LIST(state, action) {
            const { dropdown_list } = action.payload
            state.ssn_dropdown_list = dropdown_list
        },
        UPDATE_SSN_LIST(state, action) {
            const { ssn_list } = action.payload
            state.ssn_list = ssn_list
        },
    },
})

export const {
    UPDATE_MIN_DELEG,
    UPDATE_TOTAL_STAKE_AMOUNT,
    UPDATE_SSN_DROPDOWN_LIST,
    UPDATE_SSN_LIST,
} = stakingSlice.actions

export default stakingSlice.reducer;