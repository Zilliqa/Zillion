import { RootState } from "../store/store"

// for saga to read from store

export const getBlockchain = (state: RootState) => state.blockchain
export const getStakingState = (state: RootState) => state.staking