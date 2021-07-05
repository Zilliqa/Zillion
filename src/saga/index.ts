import createSagaMiddleware from 'redux-saga';
import preloadSaga from './preloadSaga';
import mySaga from './saga';

const sagaMiddleware = createSagaMiddleware();

export function startSagas() {
    sagaMiddleware.run(mySaga);
    // sagaMiddleware.run(preloadSaga);
    // sagaMiddleware.run(otherSaga)
}

export default sagaMiddleware;