import createSagaMiddleware from 'redux-saga';
import preloadSaga from './preloadSaga';
import mySaga from './saga';
import userSaga from './userSaga';

const sagaMiddleware = createSagaMiddleware();

export function startSagas() {
    sagaMiddleware.run(mySaga);
    sagaMiddleware.run(userSaga);
    // sagaMiddleware.run(preloadSaga);
    // sagaMiddleware.run(otherSaga)
}

export default sagaMiddleware;