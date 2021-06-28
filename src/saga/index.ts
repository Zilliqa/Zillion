import createSagaMiddleware from 'redux-saga';
import mySaga from './saga';

const sagaMiddleware = createSagaMiddleware();

export function startSagas() {
    sagaMiddleware.run(mySaga);
}

export default sagaMiddleware;