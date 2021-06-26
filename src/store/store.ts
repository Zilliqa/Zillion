import { configureStore } from '@reduxjs/toolkit'

import userReducer from '../store/userSlice'
import blockchainReducer from '../store/blockchainSlice'

const store = configureStore({
    reducer: {
        user: userReducer,
        blockchain: blockchainReducer,
    },
})

export default store

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch