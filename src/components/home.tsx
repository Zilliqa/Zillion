import React, { useState, useContext } from 'react';
import { withRouter } from "react-router-dom";
import { AuthContext } from '../contexts/authContext';
import WalletKeystore from './wallet-keystore';
import WalletMnemonic from './wallet-mnemonic';
import WalletLedger from './wallet-ledger';
import { AccessMethod } from '../util/enum';
import WalletZilPay from './wallet-zilpay';
import WalletPrivatekey from './wallet-privatekey';

import IconKey from './icons/key';
import IconFileCode from './icons/filecode';
import IconFileList from './icons/filelist';


function Home(props: any) {

  const authContext = useContext(AuthContext);
  const [isClicked, setIsClicked] = useState(false);
  const [accessMethod, setAccessMethod] = useState('');

  const resetWalletsClicked = () => {
    setAccessMethod('');
    setIsClicked(false);
  }

  const redirectToDashboard = () => {
    console.log("dashboard");
    props.history.push("/dashboard");
  }

  const handleAccessMethod = (access: string) => {
    setIsClicked(true);
    setAccessMethod(access);
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

  return (
    <div className="cover">
      <div className="container-fluid h-100">
        <div className="row h-100 align-items-center">
          <div className="col-12 text-center text-light">
            {
              !isClicked ?
              <>
              <h1 className="font-weight-light display-1">Stake$ZIL</h1>
              <p className="lead">Staking with Zilliqa. Revolutionize.</p>
              <p className="mt-4">Connect your wallet to begin</p>
              <div id="wallet-access" className="row align-items-center justify-content-center">
                <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.PRIVATEKEY)}><IconKey className="home-icon" /><span className="d-block mt-0.5">Private Key</span></div>
                <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.KEYSTORE)}><IconFileCode className="home-icon" /><span className="d-block mt-0.5">Keystore</span></div>
                <div className="btn-wallet-access mx-2 d-block p-4" onClick={() => handleAccessMethod(AccessMethod.MNEMONIC)}><IconFileList className="home-icon" /><span className="d-block mt-0.5">Mnemonic</span></div>
              </div>
              </>
            :
              <>
              {DisplayAccessMethod()}
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default withRouter(Home);
