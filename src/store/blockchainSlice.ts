import { createSlice } from '@reduxjs/toolkit'
import { getNetworkConfigByEnv } from '../util/config-json-helper'

export interface BlockchainState {
    proxy: string,
    impl: string,
    blockchain: string,
    staking_viewer: string,
    api_list: [],
    blockchain_explorer: string,
    refresh_rate: number,
    api_max_retry_attempt: number,
    staking_registry: string,
    staking_data: string,
}

const initialState: BlockchainState = {
    proxy: '',
    impl: '',
    blockchain: '',
    staking_viewer: '',
    api_list: [],
    blockchain_explorer: '',
    refresh_rate: 300000,
    api_max_retry_attempt: 10,
    staking_registry: '',
    staking_data: '',
}

const blockchainSlice = createSlice({
    name: 'blockchain',
    initialState: initialState,
    reducers: {
        UPDATE_CHAIN_INFO(state, action) {
            const { proxy, impl, blockchain, staking_viewer, api_list, staking_registry, staking_data } = action.payload
            state.proxy = proxy
            state.impl = impl
            state.blockchain = blockchain
            state.staking_viewer = staking_viewer
            state.api_list = api_list
            state.staking_registry = staking_registry
            state.staking_data = staking_data
        },
        UPDATE_BLOCKCHAIN_EXPLORER(state, action) {
            const { blockchain_explorer } = action.payload
            state.blockchain_explorer = blockchain_explorer
        },
        UPDATE_REFRESH_RATE(state, action) {
            const { refresh_rate } = action.payload
            state.refresh_rate = refresh_rate
        },
        UPDATE_API_MAX_ATTEMPT(state, action) {
            const { api_max_attempt } = action.payload
            state.api_max_retry_attempt = api_max_attempt
        },
        RESET_BLOCKCHAIN_STATE(state) {
            // reset config on logout
            const networkConfig = getNetworkConfigByEnv()
            state.proxy = networkConfig.proxy
            state.impl = networkConfig.impl
            state.blockchain = networkConfig.blockchain
            state.staking_viewer = networkConfig.node_status
            state.api_list = networkConfig.api_list
            state.staking_registry = networkConfig.staking_registry
            state.staking_data = networkConfig.staking_data
        },
        CONFIG_LOADED() {},
    },
})

export const {
    UPDATE_API_MAX_ATTEMPT,
    UPDATE_BLOCKCHAIN_EXPLORER,
    UPDATE_CHAIN_INFO,
    UPDATE_REFRESH_RATE,
    RESET_BLOCKCHAIN_STATE,
    CONFIG_LOADED
} = blockchainSlice.actions

export default blockchainSlice.reducer;