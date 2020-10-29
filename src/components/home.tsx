import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { withRouter } from "react-router-dom";
import ReactTooltip from "react-tooltip";
import { trackPromise } from 'react-promise-tracker';

import { AccessMethod, Environment, Network, Role, NetworkURL, SsnStatus, PromiseArea, ContractState } from '../util/enum';
import AppContext from "../contexts/appContext";
import DisclaimerModal from './disclaimer';
import SsnTable from './ssn-table';
import * as ZilliqaAccount from "../account";
import Footer from './footer';

import WalletKeystore from './wallet-keystore';
import WalletLedger from './wallet-ledger';
import WalletZilPay from './wallet-zilpay';

import IconKeystoreLine from './icons/keystore-line';
import IconLedgerLine from './icons/ledger-line';
import IconZilPayLine from './icons/zil-pay-line';
import IconSun from './icons/sun';
import IconMoon from './icons/moon';

import ZillionLogo from '../static/zillion.svg';
import ZillionLightLogo from '../static/light/zillion.svg';
import LandingStatsTable from './landing-stats-table';
import { SsnStats } from '../util/interface';

import { toBech32Address } from '@zilliqa-js/crypto';
import { useInterval } from '../util/use-interval';
import useDarkMode from '../util/use-dark-mode';
import { ToastContainer } from 'react-toastify';
import IconSearch from './icons/search';
import WarningBanner from './warning-banner';


function Home(props: any) {
  const appContext = useContext(AppContext);
  const { updateNetwork } = appContext;

  // config.js from public folder
  const { networks_config, refresh_rate_config, environment_config } = (window as { [key: string]: any })['config'];

  const [isDirectDashboard, setIsDirectDashboard] = useState(false);
  const [isShowAccessMethod, setShowAccessMethod] = useState(false);
  const [explorerSearchAddress, setExplorerSearchAddress] = useState('');
  const [role, setRole] = useState('');
  const [accessMethod, setAccessMethod] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState(() => {
    if (environment_config === Environment.PROD) {
      return Network.MAINNET;
    } else {
      // default to testnet
      return Network.TESTNET;
    }
  });

  // for populating ssn table
  const [totalStakeAmt, setTotalStakeAmt] = useState('0');
  const [ssnStats, setSsnStats] = useState([] as SsnStats[]);

  const darkMode = useDarkMode(true);

  const mountedRef = useRef(true);

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

  const handleShowAccessMethod = (selectedRole: string) => {
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

  /* fetch data for contract constants */
  const getContractConstants = useCallback(() => {
    let totalStakeAmt = '0';
    let impl = networks_config[selectedNetwork].impl;

    ZilliqaAccount.getImplState(impl, 'totalstakeamount')
    .then((contractState) => {
        if (contractState === undefined || contractState === 'error') {
            return null;
        }
        totalStakeAmt = contractState.totalstakeamount;
    })
    .finally(() => {
        if (mountedRef.current) {
            setTotalStakeAmt(totalStakeAmt);
        }
    });
  }, [networks_config, selectedNetwork]);

  
  /* fetch data for ssn panel */
  const getSsnStats = useCallback(() => {
      let output: SsnStats[] = [];
      let impl = networks_config[selectedNetwork].impl;

      trackPromise(ZilliqaAccount.getImplState(impl, 'ssnlist')
          .then(async (contractState) => {
              if (contractState === undefined || contractState === 'error') {
                  return null;
              }

              for (const ssnAddress in contractState['ssnlist']) {
                  const ssnArgs = contractState['ssnlist'][ssnAddress]['arguments'];
                  let delegNum = '0';
                  let status = SsnStatus.INACTIVE;

                  // get ssn status
                  if (ssnArgs[0]['constructor'] === 'True') {
                      status = SsnStatus.ACTIVE;
                  }

                  // get number of delegators
                  const delegNumState = await ZilliqaAccount.getImplState(impl, 'ssn_deleg_amt');

                  if (delegNumState.hasOwnProperty('ssn_deleg_amt') &&
                      ssnAddress in delegNumState['ssn_deleg_amt']) {
                      delegNum = Object.keys(delegNumState['ssn_deleg_amt'][ssnAddress]).length.toString();
                  }

                  const data: SsnStats = {
                      address: toBech32Address(ssnAddress),
                      name: ssnArgs[3],
                      apiUrl: ssnArgs[5],
                      stakeAmt: ssnArgs[1],
                      bufferedDeposits: ssnArgs[6],
                      commRate: ssnArgs[7],
                      commReward: ssnArgs[8],
                      delegNum: delegNum,
                      status: status,
                  }

                  output.push(data);
              }
          })
          .finally(() => {

              if (mountedRef.current) {
                  console.log("updating main ssn stats...");
                  setSsnStats([...output]);
              }
          }), PromiseArea.PROMISE_GET_SSN_STATS);

  }, [networks_config, selectedNetwork]);

    
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

  const toggleTheme = () => {
    if (darkMode.value === true) {
      darkMode.disable();
    } else {
      darkMode.enable();
    }
  }

  const toggleZillionLogo = () => {
    if (darkMode.value === true) {
      return <img src={ZillionLogo} alt="zillion" width="480px" className="mt-2 mb-4 zillion-logo" />;
    } else {
      return <img src={ZillionLightLogo} alt="zillion" width="480px" className="mt-2 mb-4 zillion-logo" />;
    }
  }

  const handleExplorerSearchAddress = (e: any) => {
    setExplorerSearchAddress(e.target.value);
  }

  const handleExplorerKeyPress = (e: any) => {
    if (e.keyCode === 13) {
      // Enter key
      // proceed to search
      explorerCheckRewards();
    }
  }

  const explorerCheckRewards = () => {
    const zillionExplorerUrl = "/address/" + explorerSearchAddress
    props.history.push(zillionExplorerUrl);
  };

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
    // eslint-disable-next-line
  }, [selectedNetwork]);

  useEffect(() => {
    window.onbeforeunload = null;
  }, []);


  // load initial data
  useEffect(() => {
    getContractConstants();
    getSsnStats();
    return () => {
      mountedRef.current = false;
    }
  }, [getContractConstants, getSsnStats])

  // poll data
  useInterval(() => {
    getContractConstants();
    getSsnStats();
  }, mountedRef, refresh_rate_config);

  return (
    <div className="cover">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="cover-content col-12 text-center">
            
            <WarningBanner />

            <div 
              id="home-mini-navbar" 
              className={
                ContractState.IS_PAUSED.toString() === "true" ? 
                'home-mini-navbar-disabled d-flex align-items-end mr-4' : 
                'home-mini-navbar-enabled d-flex align-items-end mr-4'}>

              <div>
                <button type="button" className="btn btn-theme shadow-none mr-3" onClick={toggleTheme}>
                  { 
                    darkMode.value === true ? 
                      <IconSun width="20" height="20"/> : 
                      <IconMoon width="20" height="20"/>
                  }
                </button>
              </div>

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
              <>{toggleZillionLogo()}</>
              <p className="tagline">Staking with Zilliqa. Simplified!</p>
            </div>

            {
              !isShowAccessMethod ?

              
              <div className="initial-load">
                { /* sign in and seed node table */ }
                <div className="btn btn-sign-in mt-4 mx-3" onClick={() => handleShowAccessMethod(Role.DELEGATOR.toString())}>Sign in for Delegators</div>
                <div className="btn btn-sign-in mt-4 mx-3" onClick={() => handleShowAccessMethod(Role.OPERATOR.toString())}>Sign in for Operators</div>

                <div className="d-flex justify-content-center h-100">
                  <div className="explorer-search">
                    <input type="text" className="explorer-search-input" value={explorerSearchAddress} onKeyDown={handleExplorerKeyPress} onChange={handleExplorerSearchAddress} placeholder="Enter wallet address to check rewards" maxLength={42}/>
                    <button type="button" className="btn explorer-search-icon shadow-none" onClick={() => explorerCheckRewards()}><IconSearch width="18" height="18" /></button>
                  </div>
                </div>

                <LandingStatsTable impl={networks_config[selectedNetwork].impl} network={networks_config[selectedNetwork].blockchain} refresh={refresh_rate_config} />

                <div id="home-ssn-details" className="container">
                  <div className="row pl-2 pt-4">
                    <div className="col text-left">
                      <h2>Staked Seed Nodes</h2>
                      <p className="info mt-4 mb-0">Please refer to our&nbsp; 
                          <a className="info-link" href={networks_config[selectedNetwork].node_status ? 
                              networks_config[selectedNetwork].node_status : 
                              "https://zilliqa.com/"} 
                                target="_blank" 
                                rel="noopener noreferrer">
                                   Staking Viewer 
                          </a> 
                        &nbsp;for more information on the nodes' statuses.
                      </p>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-12 content">
                        <SsnTable 
                          impl={networks_config[selectedNetwork].impl} 
                          network={networks_config[selectedNetwork].blockchain} 
                          refresh={refresh_rate_config}
                          data={ssnStats}
                          totalStakeAmt={totalStakeAmt} />
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

                  <div 
                    className="btn-wallet-access d-block" 
                    onClick={() => handleAccessMethod(AccessMethod.KEYSTORE)}>
                      <IconKeystoreLine className="home-icon my-4" height="42px" /><span className="d-block mt-0.5">Keystore</span>
                  </div>

                  <div 
                    className="btn-wallet-access d-block" 
                    onClick={() => handleAccessMethod(AccessMethod.LEDGER)}>
                      <IconLedgerLine className="home-icon icon-ledger-line my-4" /><span className="d-block mt-0.5">Ledger</span>
                  </div>

                  <div 
                    className="btn-wallet-access d-block" 
                    onClick={() => handleAccessMethod(AccessMethod.ZILPAY)} 
                    data-tip={ environment_config === Environment.PROD ? "Ensure your ZilPay is on Mainnet network" : "Ensure your ZilPay is on Testnet network" }>
                      <IconZilPayLine className="home-icon icon-zilpay-line my-4" /><span className="d-block mt-0.5">ZilPay</span>
                  </div>
                  
                  <ReactTooltip place="bottom" type="light" effect="float" />
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
          <ToastContainer hideProgressBar={true} />
          <Footer networkLabel={selectedNetwork} />
          <DisclaimerModal />
        </div>
      </div>
    </div>
  );
}

export default withRouter(Home);
