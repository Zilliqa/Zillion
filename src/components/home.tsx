import React, { useState, useContext } from 'react';
import { withRouter } from "react-router-dom";

import { AuthContext } from '../contexts/authContext';
import { AccessMethod, Network, Role } from '../util/enum';
import SsnTable from './ssn-table';

import WalletKeystore from './wallet-keystore';
import WalletMnemonic from './wallet-mnemonic';
import WalletLedger from './wallet-ledger';
import WalletZilPay from './wallet-zilpay';
import WalletPrivatekey from './wallet-privatekey';

import IconKey from './icons/key';
import IconFileCode from './icons/filecode';
import IconFileList from './icons/filelist';
import IconLedger from './icons/ledger';


function Home(props: any) {

  const authContext = useContext(AuthContext);
  const [isClicked, setIsClicked] = useState(false);
  const [isDirectDashboard, setIsDirectDashboard] = useState(false);
  const [isShowAccessMethod, setShowAccessMethod] = useState(false);
  const [role, setRole] = useState(Role.DELEGATOR);
  const [accessMethod, setAccessMethod] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');

  const resetWalletsClicked = () => {
    setAccessMethod('');
    setIsDirectDashboard(false);
  }

  const redirectToDashboard = () => {
    console.log("dashboard");
    setIsDirectDashboard(true);
    setTimeout(() => {
      props.history.push("/dashboard");
    }, 1000);
  }

  const handleAccessMethod = (access: string) => {
    setAccessMethod(access);
  }

  const handleChangeNetwork = (e: any) => {
    setSelectedNetwork(e.target.value);
  }

  const handleShowAccessMethod = (selectedRole: Role) => {
    setRole(selectedRole);
    setShowAccessMethod(true);
  }

  const resetView = () => {
    setRole(Role.DELEGATOR);
    setShowAccessMethod(false);
    setAccessMethod('');
  }

  const DisplayAccessMethod = () => {
    switch (accessMethod) {
      case AccessMethod.PRIVATEKEY:
        return <WalletPrivatekey onReturnCallback={resetWalletsClicked} onSuccessCallback={redirectToDashboard} />;
      case AccessMethod.KEYSTORE: 
        return <WalletKeystore onReturnCallback={resetWalletsClicked} onSuccessCallback={redirectToDashboard} />;
      case AccessMethod.MNEMONIC:
        return <WalletMnemonic onReturnCallback={resetWalletsClicked} onSuccessCallback={redirectToDashboard} />;
      case AccessMethod.ZILPAY:
        return <WalletZilPay onReturnCallback={resetWalletsClicked} onSuccessCallback={redirectToDashboard} />
      case AccessMethod.LEDGER:
        return <WalletLedger onReturnCallback={resetWalletsClicked} onSuccessCallback={redirectToDashboard} />
      default:
        return null;
    }
  }

  const DisplayLoader = () => {
    return (
      <div className="animate__animated animate__fadeIn">
        <h2 className="mb-4">Connecting...</h2>
        <div className="spinner-border" role="status">
          <span className="sr-only">Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cover">
      <div className="container-fluid h-100">
        <div className="row h-100 align-items-center">
          <div className="col-12 text-center text-light">

            {
              !isShowAccessMethod &&

              <div id="home-mini-navbar" className="d-flex flex-column align-items-end mt-4 mr-4">
                <div className="form-group">
                    <select id="home-network-selector" value={selectedNetwork} onChange={handleChangeNetwork} className="form-control-xs">
                        <option value={Network.TESTNET}>Testnet</option>
                        <option value={Network.MAINNET}>Mainnet</option>
                        <option value={Network.ISOLATED_SERVER}>Isolated Server</option>
                    </select>
                </div>
              </div>
            }

            <div className="heading">
              <h1 className="font-weight-light display-1">Stake$ZIL</h1>
              <p className="lead">Staking with Zilliqa. Revolutionize.</p>
            </div>

            {
              !isShowAccessMethod ?

              
              <div className="initial-load">
                { /* sign in and seed node table */ }
                <div className="btn btn-sign-in mt-4 mx-2" onClick={() => handleShowAccessMethod(Role.DELEGATOR)}>Sign in for Delegators</div>
                <div className="btn btn-sign-in mt-4 mx-2" onClick={() => handleShowAccessMethod(Role.OPERATOR)}>Sign in for Operators</div>
                <div id="home-ssn-details" className="container">
                  <div className="row rounded p-4">
                    <h2 className="mb-4">Staked Seed Nodes</h2>
                    <div className="col-12">
                      <SsnTable proxy={process.env.REACT_APP_PROXY} network={selectedNetwork} refresh={process.env.REACT_APP_DATA_REFRESH_RATE} />
                    </div>
                  </div>
                </div>
              </div>

              :

              !accessMethod ?

              <>
                { /* no wallets selected - show wallets to connect */ }
                <p className="mt-5 animate__animated animate__fadeIn"><strong>Connect your wallet to start</strong></p>
                <div id="wallet-access" className="row align-items-center justify-content-center animate__animated animate__fadeIn">
                  <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.PRIVATEKEY)}><IconKey className="home-icon" /><span className="d-block mt-0.5">Private Key</span></div>
                  <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.KEYSTORE)}><IconFileCode className="home-icon" /><span className="d-block mt-0.5">Keystore</span></div>
                  <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.MNEMONIC)}><IconFileList className="home-icon" /><span className="d-block mt-0.5">Mnemonic</span></div>
                  <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.LEDGER)}><IconLedger className="home-icon my-3" width="32" height="32" /><span className="d-block mt-0.5">Ledger</span></div>
                </div>
                <button type="button" className="btn-user-action-cancel mt-4" onClick={() => resetView()}>Back to Main</button>
              </>

              :

              <>
              {/* wallet selected - show chosen wallet component */}
              {DisplayAccessMethod()} 
              </>
            }

            {/* { isDirectDashboard ? <>{DisplayLoader()}</> } */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withRouter(Home);
