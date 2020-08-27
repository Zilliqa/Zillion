import React, { useState, useContext } from 'react';
import { withRouter } from "react-router-dom";
import { AuthContext } from '../contexts/authContext';
import WalletKeystore from './wallet-keystore';
import WalletMnemonic from './wallet-mnemonic';
import WalletLedger from './wallet-ledger';
import { AccessMethod } from '../util/enum';
import '../app.css';
import WalletZilPay from './wallet-zilpay';
import WalletPrivatekey from './wallet-privatekey';


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
              <h1 className="font-weight-light display-1">StakeZ</h1>
              <p className="lead">Staking in Zilliqa</p>
              <p>Connect your wallet to begin</p>
              <div id="wallet-access">
                <button type="button" className="btn btn-primary" onClick={() => handleAccessMethod(AccessMethod.PRIVATEKEY)}>Private Key</button>
                <button type="button" className="btn btn-primary" onClick={() => handleAccessMethod(AccessMethod.KEYSTORE)}>Keystore</button>
                <button type="button" className="btn btn-primary" onClick={() => handleAccessMethod(AccessMethod.MNEMONIC)}>Mnemonic</button>
                <button type="button" className="btn btn-primary" onClick={() => handleAccessMethod(AccessMethod.ZILPAY)}>ZilPay [WIP]</button>
                <button type="button" className="btn btn-primary" onClick={() => handleAccessMethod(AccessMethod.LEDGER)}>Ledger [WIP]</button>
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
