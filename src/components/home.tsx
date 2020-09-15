import React, { useState, useContext, useEffect } from 'react';
import { withRouter } from "react-router-dom";

import { AccessMethod, Environment, Network, Role, NetworkURL } from '../util/enum';
import AppContext from "../contexts/appContext";
import DisclaimerModal from './disclaimer';
import SsnTable from './ssn-table';
import * as ZilliqaAccount from "../account";

import WalletKeystore from './wallet-keystore';
import WalletLedger from './wallet-ledger';
import WalletZilPay from './wallet-zilpay';

import IconKeystoreLine from './icons/keystore-line';
import IconLedgerLine from './icons/ledger-line';
import IconZilPayLine from './icons/zil-pay-line';

import ZillionLogo from '../static/zillion.svg';


function Home(props: any) {
  const appContext = useContext(AppContext);
  const { updateNetwork } = appContext;

  // config.js from public folder
  const { networks_config, refresh_rate_config, environment_config } = (window as { [key: string]: any })['config'];

  const [isDirectDashboard, setIsDirectDashboard] = useState(false);
  const [isShowAccessMethod, setShowAccessMethod] = useState(false);
  const [role, setRole] = useState('');
  const [accessMethod, setAccessMethod] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState(Network.TESTNET);

  // trigger show wallets to choose
  const resetWalletsClicked = () => {
    setAccessMethod('');
    setIsDirectDashboard(false);
  }

  const timeout = (delay: number) => {
    return new Promise(res => setTimeout(res, delay));
  }

  const redirectToDashboard = async () => {
    // add some delay
    await timeout(1000);
    console.log("directing to dashboard");
    props.history.push("/dashboard");
  }

  const handleAccessMethod = (access: string) => {
    setAccessMethod(access);
  }

  const handleChangeNetwork = (e: any) => {
    setSelectedNetwork(e.target.value);
    updateNetwork(e.target.value);
  }

  const handleShowAccessMethod = (selectedRole: Role) => {
    setRole(selectedRole);
    setShowAccessMethod(true);
  }

  const toggleDirectToDashboard = () => {
    setIsDirectDashboard(true);
  }

  const resetView = () => {
    setRole('');
    setShowAccessMethod(false);
    setAccessMethod('');
  }

  const DisplayAccessMethod = () => {
    switch (accessMethod) {
      case AccessMethod.KEYSTORE: 
        return <WalletKeystore 
                  onReturnCallback={resetWalletsClicked} 
                  onWalletLoadingCallback={toggleDirectToDashboard} 
                  onSuccessCallback={redirectToDashboard} 
                  role={role} />;
      case AccessMethod.ZILPAY:
        return <WalletZilPay 
                  onReturnCallback={resetWalletsClicked} 
                  onWalletLoadingCallback={toggleDirectToDashboard}
                  onSuccessCallback={redirectToDashboard}
                  role={role} />;
      case AccessMethod.LEDGER:
        return <WalletLedger 
                  onReturnCallback={resetWalletsClicked}
                  onWalletLoadingCallback={toggleDirectToDashboard} 
                  onSuccessCallback={redirectToDashboard} 
                  role={role} />;
      default:
        return null;
    }
  }

  const DisplayLoader = () => {
    console.log("retrieving wallet info...");
    return (
      <div className="wallet-access">
        <h2>Retrieving wallet info...</h2>
        <div className="spinner-border dashboard-spinner" role="status">
          <span className="sr-only">Connecting...</span>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (environment_config === Environment.PROD) {
      setSelectedNetwork(Network.MAINNET);
      updateNetwork(Network.MAINNET);
      ZilliqaAccount.changeNetwork(NetworkURL.MAINNET);

    } else if (environment_config === Environment.STAGE) {
      setSelectedNetwork(Network.TESTNET);
      updateNetwork(Network.TESTNET);
      ZilliqaAccount.changeNetwork(NetworkURL.TESTNET);
    }
  }, [selectedNetwork]);

  return (
    <div className="cover">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="cover-content col-12 text-center text-light">

            <div id="home-mini-navbar" className="d-flex flex-column align-items-end mt-4 mr-4">

              { 
                environment_config === Environment.DEV && 

                <div className="form-group">
                    <select id="home-network-selector" value={selectedNetwork} onChange={handleChangeNetwork} className="form-control-xs">
                        <option value={Network.TESTNET}>Testnet</option>
                        <option value={Network.MAINNET}>Mainnet</option>
                        <option value={Network.ISOLATED_SERVER}>Isolated Server</option>
                    </select>
                </div>
              }

              { 
                ( environment_config === Environment.STAGE || environment_config === Environment.PROD ) && 
                <span className="mr-2">{selectedNetwork}</span>
              }

            </div>

            <div className="heading">
              <img src={ZillionLogo} alt="zillion" width="480px" className="mt-2 mb-4" />
              <p className="tagline">Staking with Zilliqa. Simplified</p>
            </div>

            {
              !isShowAccessMethod ?

              
              <div className="initial-load">
                { /* sign in and seed node table */ }
                <div className="btn btn-sign-in mt-4 mx-3" onClick={() => handleShowAccessMethod(Role.DELEGATOR)}>Sign in for Delegators</div>
                <div className="btn btn-sign-in mt-4 mx-3" onClick={() => handleShowAccessMethod(Role.OPERATOR)}>Sign in for Operators</div>
                <div id="home-ssn-details" className="container">
                  <div className="row p-4">
                    <h2 className="mb-4">Staked Seed Nodes</h2>
                    <div className="col-12 content">
                        <SsnTable proxy={networks_config[selectedNetwork].proxy} network={networks_config[selectedNetwork].blockchain} refresh={refresh_rate_config} />
                    </div>
                  </div>
                </div>
              </div>

              :

              !accessMethod ?

              <>
                { /* no wallets selected - show wallets to connect */ }
                <p className="wallet-connect-text animate__animated animate__fadeIn"><strong>Connect your wallet to start</strong></p>
                <div id="wallet-access" className="row align-items-center justify-content-center animate__animated animate__fadeIn mb-4">
                  <div className="btn-wallet-access d-block" onClick={() => handleAccessMethod(AccessMethod.KEYSTORE)}><IconKeystoreLine className="home-icon my-4" height="42px" /><span className="d-block mt-0.5">Keystore</span></div>
                  <div className="btn-wallet-access d-block" onClick={() => handleAccessMethod(AccessMethod.LEDGER)}><IconLedgerLine className="home-icon icon-ledger-line my-4" /><span className="d-block mt-0.5">Ledger</span></div>
                  <div className="btn-wallet-access d-block" onClick={() => handleAccessMethod(AccessMethod.ZILPAY)}><IconZilPayLine className="home-icon icon-zilpay-line my-4" /><span className="d-block mt-0.5">ZilPay</span></div>
                </div>
                <button type="button" className="btn btn-user-action-cancel mt-5 animate__animated animate__fadeIn" onClick={() => resetView()}>Back to Main</button>
              </>

              :

              <>
              {/* wallet selected - show chosen wallet component */}
              { isDirectDashboard ? 
              
              <>{DisplayLoader()}</> 
              
              :
              
              <>{DisplayAccessMethod()}</> }
              
              </>
            }
          </div>
          <footer id="disclaimer" className="align-items-start">
            <div className="p-2">
              <span className="ml-4 mx-3">&copy; 2020 Zilliqa</span> 
              <button type="button" className="btn" data-toggle="modal" data-target="#disclaimer-modal" data-keyboard="false" data-backdrop="static">Disclaimer</button>
            </div>
          </footer>
          <DisclaimerModal />
        </div>
      </div>
    </div>
  );
}

export default withRouter(Home);
