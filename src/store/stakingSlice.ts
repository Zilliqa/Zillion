/**
 * stores info related to staking, e.g. contract states, staked amount
 */

import { createSlice } from '@reduxjs/toolkit'
import { OperationStatus } from '../util/enum'
import { initialLandingStats, LandingStats, NodeOptions, SsnStats } from '../util/interface'


export interface StakingState {
    gzil_address: string,
    gzil_total_supply: string,                  // number of gzils currently minted,
    min_deleg_stake: string,                    // min amount to deleg in Qa
    total_stake_amount: string                  // sum of all stakes in contract Qa
    ssn_dropdown_list: NodeOptions[]            // to display ssn list as dropdown options in redeleg modal
    landing_stats: LandingStats,                // data for landing stats page 
    ssn_list: SsnStats[],                       // hold all the list of ssn info
    zil_max_supply: string,
    is_landing_stats_loading: OperationStatus   // landing stats status indicator
    is_ssn_stats_loading: OperationStatus       // ssn table status indicator
}

const initialState: StakingState = {
    gzil_address: '',
    gzil_total_supply: '0',
    landing_stats: initialLandingStats,
    min_deleg_stake: '0',
    total_stake_amount: '0',
    ssn_dropdown_list: [],
    ssn_list: [],
    zil_max_supply: '0',
    is_landing_stats_loading: OperationStatus.IDLE,
    is_ssn_stats_loading: OperationStatus.IDLE,
}

const stakingSlice = createSlice({
    name: 'staking',
    initialState: initialState,
    reducers: {
        UPDATE_GZIL_ADDRESS(state, action) {
            const { gzil_address } = action.payload
            state.gzil_address = gzil_address
        },
        UPDATE_GZIL_TOTAL_SUPPLY(state, action) {
            const { gzil_total_supply } = action.payload
            state.gzil_total_supply = gzil_total_supply
        },
        UPDATE_LANDING_STATS(state, action) {
            const { landing_stats } = action.payload
            state.landing_stats = landing_stats;
        },
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
        UPDATE_ZIL_MAX_SUPPLY(state, action) {
            const { zil_max_supply } = action.payload
            state.zil_max_supply = zil_max_supply
        },
        UPDATE_FETCH_LANDING_STATS_STATUS(state, action) {
            state.is_landing_stats_loading = action.payload
        },
        UPDATE_FETCH_SSN_STATS_STATUS(state, action) {
            state.is_ssn_stats_loading = action.payload
        },
    },
})

export const {
    UPDATE_GZIL_ADDRESS,
    UPDATE_GZIL_TOTAL_SUPPLY,
    UPDATE_LANDING_STATS,
    UPDATE_MIN_DELEG,
    UPDATE_TOTAL_STAKE_AMOUNT,
    UPDATE_SSN_DROPDOWN_LIST,
    UPDATE_SSN_LIST,
    UPDATE_ZIL_MAX_SUPPLY,
    UPDATE_FETCH_LANDING_STATS_STATUS,
    UPDATE_FETCH_SSN_STATS_STATUS
} = stakingSlice.actions

export default stakingSlice.reducer;