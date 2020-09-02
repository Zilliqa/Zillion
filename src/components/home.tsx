import React, { useState, useContext } from 'react';
import { withRouter } from "react-router-dom";

import { AuthContext } from '../contexts/authContext';
import { AccessMethod, Network } from '../util/enum';
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
  const [accessMethod, setAccessMethod] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');

  const resetWalletsClicked = () => {
    setAccessMethod('');
    setIsClicked(false);
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
    setIsClicked(true);
    setAccessMethod(access);
  }

  const handleChangeNetwork = (e: any) => {
    setSelectedNetwork(e.target.value);
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
              !isClicked ?
              <>

              <div id="home-mini-navbar" className="d-flex flex-column align-items-end mt-4 mr-4">
                <div className="form-group">
                    <select id="home-network-selector" value={selectedNetwork} onChange={handleChangeNetwork} className="form-control-xs">
                        <option value={Network.TESTNET}>Testnet</option>
                        <option value={Network.MAINNET}>Mainnet</option>
                        <option value={Network.ISOLATED_SERVER}>Isolated Server</option>
                    </select>
                </div>
                <div className="btn-test mx-2">Sign in with Wallet</div>
              </div>

              <h1 className="font-weight-light display-1">Stake$ZIL</h1>
              <p className="lead">Staking with Zilliqa. Revolutionize.</p>

              <div id="home-ssn-details" className="container">
                <div className="row rounded p-4">
                  <h2 className="mb-4">Staked Seed Nodes</h2>
                  <div className="col-12">
                    <SsnTable proxy={process.env.REACT_APP_PROXY} network={selectedNetwork} />
                  </div>
                </div>
              </div>
        
              {/* <p className="mt-5"><strong>Connect your wallet to start</strong></p>
              <div id="wallet-access" className="row align-items-center justify-content-center">
                <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.PRIVATEKEY)}><IconKey className="home-icon" /><span className="d-block mt-0.5">Private Key</span></div>
                <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.KEYSTORE)}><IconFileCode className="home-icon" /><span className="d-block mt-0.5">Keystore</span></div>
                <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.MNEMONIC)}><IconFileList className="home-icon" /><span className="d-block mt-0.5">Mnemonic</span></div>
                <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.LEDGER)}><IconLedger className="home-icon my-3" width="32" height="32" /><span className="d-block mt-0.5">Ledger</span></div>
              </div> */}
              </>
            :
              <>
              { isDirectDashboard ? <>{DisplayLoader()}</> : <>{DisplayAccessMethod()}</> }
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default withRouter(Home);
