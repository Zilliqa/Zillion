import { configureStore, getDefaultMiddleware, Middleware } from '@reduxjs/toolkit'

import userReducer from '../store/userSlice'
import blockchainReducer from '../store/blockchainSlice'
import sagaMiddleware, { startSagas } from '../saga'

const middlewares: Middleware[] = [...getDefaultMiddleware(), sagaMiddleware]

const store = configureStore({
    reducer: {
        user: userReducer,
        blockchain: blockchainReducer,
    },
    middleware: middlewares
})

startSagas()

export default store

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch