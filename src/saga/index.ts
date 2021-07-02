import createSagaMiddleware from 'redux-saga';
import mySaga from './saga';

const sagaMiddleware = createSagaMiddleware();

export function startSagas() {
    sagaMiddleware.run(mySaga);
    // sagaMiddleware.run(otherSaga)
}

export default sagaMiddleware;