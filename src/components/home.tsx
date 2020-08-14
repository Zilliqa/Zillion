import React, { useState } from 'react';
import { useHistory } from "react-router-dom";
import WalletKeystore from './wallet-keystore';
import '../app.css';


function Home(props: any) {

  let history = useHistory();
  const {authContext} = props;
  const [isKeystoreClicked, setIsKeystoreClicked] = useState(false);

  const resetWalletsClicked = () => {
    setIsKeystoreClicked(false);
  }

  const redirectToDashboard = () => {
    console.log("dashboard");
    authContext.toggleAuthentication();
    history.push("/dashboard");
  }

  return (
    <div className="cover">
      <div className="container-fluid h-100">
        <div className="row h-100 align-items-center">
          <div className="col-12 text-center text-light">
            {
              !isKeystoreClicked ?
              <>
              <h1 className="font-weight-light display-1">StakeZ</h1>
              <p className="lead">Staking in Zilliqa</p>
              <p>Connect your wallet to begin</p>
              <div id="wallet-access">
                <button type="button" className="btn btn-primary" onClick={() => setIsKeystoreClicked(true)}>Keystore</button>
                <button type="button" className="btn btn-primary">ZilPay</button>
                <button type="button" className="btn btn-primary">Moonlet</button>
                <button type="button" className="btn btn-primary">Ledger</button>
              </div>
              </>
            :
              <WalletKeystore returnToMain={resetWalletsClicked} onSuccess={redirectToDashboard}/>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
