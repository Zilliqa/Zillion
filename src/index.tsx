import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './app';
import * as serviceWorker from './serviceWorker';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import './app.css';
import './media-queries.css';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store'
import { Environment, Network } from './util/enum';
import { CONFIG_LOADED, UPDATE_API_MAX_ATTEMPT, UPDATE_BLOCKCHAIN_EXPLORER, UPDATE_CHAIN_INFO, UPDATE_REFRESH_RATE } from './store/blockchainSlice';

// config.js from public folder
const { environment_config, networks_config, blockchain_explorer_config, refresh_rate_config, api_max_retry_attempt } = (window as { [key: string]: any })['config'];

// store the config file info to redux
// to allow other components to read the contract
if (environment_config === Environment.PROD) {
  store.dispatch(UPDATE_CHAIN_INFO({
    proxy: networks_config[Network.MAINNET].proxy,
    impl: networks_config[Network.MAINNET].impl,
    blockchain: networks_config[Network.MAINNET].blockchain,
    staking_viewer: networks_config[Network.MAINNET].node_status,
    api_list: networks_config[Network.MAINNET].api_list,
  }));
} else {
  // defaults to testnet
  store.dispatch(UPDATE_CHAIN_INFO({
    proxy: networks_config[Network.TESTNET].proxy,
    impl: networks_config[Network.TESTNET].impl,
    blockchain: networks_config[Network.TESTNET].blockchain,
    staking_viewer: networks_config[Network.TESTNET].node_status,
    api_list: networks_config[Network.TESTNET].api_list,
  }));
}

store.dispatch(UPDATE_REFRESH_RATE({ refresh_rate: refresh_rate_config }));
store.dispatch(UPDATE_API_MAX_ATTEMPT({ api_max_attempt: api_max_retry_attempt }));
store.dispatch(UPDATE_BLOCKCHAIN_EXPLORER({ blockchain_explorer: blockchain_explorer_config }));
store.dispatch(CONFIG_LOADED()); // informs saga to start polling data

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <App/>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
