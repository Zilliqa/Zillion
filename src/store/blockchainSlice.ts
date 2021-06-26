import { createSlice } from '@reduxjs/toolkit'

interface BlockchainState {
    proxy: string,
    impl: string,
    blockchain: string,
    staking_viewer: string,
    api_list: [],
    blockchain_explorer: string,
    refresh_rate: number,
    api_max_retry_attempt: number,
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
}

const blockchainSlice = createSlice({
    name: 'blockchain',
    initialState: initialState,
    reducers: {
        updateChainInfo(state, action) {
            const { proxy, impl, blockchain, staking_viewer, api_list } = action.payload
            state.proxy = proxy
            state.impl = impl
            state.blockchain = blockchain
            state.staking_viewer = staking_viewer
            state.api_list = api_list
        },
        updateBlockchainExplorer(state, action) {
            const { blockchain_explorer } = action.payload
            state.blockchain_explorer = blockchain_explorer
        },
        updateRefreshRate(state, action) {
            const { refresh_rate } = action.payload
            state.refresh_rate = refresh_rate
        },
        updateApiMaxAttempt(state, action) {
            const { api_max_attempt } = action.payload
            state.api_max_retry_attempt = api_max_attempt
        },
    },
})

export const {
    updateApiMaxAttempt,
    updateBlockchainExplorer,
    updateChainInfo,
    updateRefreshRate
} = blockchainSlice.actions

export default blockchainSlice.reducer;