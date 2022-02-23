import React, { useState } from 'react';
import logo from "../../static/logo.png";
import { useAppSelector } from '../../store/hooks';
import { NetworkURL } from '../../util/enum';
import { convertQaToCommaStr, getAddressLink } from '../../util/utils';
import IconBell from '../icons/bell';
import IconShuffle from '../icons/shuffle';
import IconSun from '../icons/sun';


function TopBar(props: any) {
    const userState = useAppSelector(state => state.user);
    const networkURL = useAppSelector(state => state.blockchain.blockchain);

    const {activeTab, setActiveTab} = props; // home, staking

    const displayNetwork = () => {
        let text = '';

        switch (networkURL) {
            case NetworkURL.TESTNET:
                text = 'Testnet';        
                break;
            case NetworkURL.MAINNET:
                text = 'Mainnet';
                break;
            case NetworkURL.ISOLATED_SERVER:
                text = 'Isolated Server';
                break;
            default:
                text = 'Unknown';
        }
        return <span>{text}</span>;
    }

    return (
        <div>
            <nav className="navbar navbar-expand-lg navbar-dark">
                <button type="button" className="btn navbar-brand shadow-none p-0 pl-2">
                    <div className="d-flex align-items-center">
                        <img className="logo mx-auto" src={logo} alt="zilliqa_logo"/>
                        <span className="navbar-title">ZILLION</span>
                    </div>
                </button>
                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav mx-auto">
                        <li className="nav-item mx-4">
                            <div className="nav-page-link">
                                <button 
                                    type="button" 
                                    className={`btn shadow-none ${ activeTab === 'home' && 'active' }`}
                                    onClick={() => setActiveTab('home')}>
                                    Home
                                </button>
                            </div>
                        </li>
                        <li className="nav-item mx-4">
                            <div className="nav-page-link">
                                <button 
                                    type="button" 
                                    className={`btn shadow-none ${ activeTab === 'staking' && 'active' }`}
                                    onClick={() => setActiveTab('staking')}>
                                    Staking
                                </button>
                            </div>
                        </li>
                    </ul>
                    <ul className="navbar-nav navbar-right">
                        {/* wallet */}
                        <li className="nav-item">
                            <div className="px-1">
                                {
                                    userState.address_bech32 ? 
                                    <a href={getAddressLink(userState.address_bech32, networkURL)} 
                                        className="wallet-link" 
                                        target="_blank" 
                                        rel="noopener noreferrer">
                                            {userState.address_bech32}
                                    </a> : 
                                    <div className="wallet-link">No wallet detected</div>
                                 }
                            </div>
                        </li>

                        {/* balance */}
                        <li className="nav-item">
                            <div className="px-1">
                                {userState.balance ? convertQaToCommaStr(`${userState.balance}`) : '0.000'} ZIL
                            </div>
                        </li>

                        {/* network */}
                        <li className="nav-item">
                            <div className="px-1">
                                {displayNetwork()}
                            </div>
                        </li>

                        {/* utility buttons */}

                        {/* transfer stake */}
                        <li className="nav-item">
                            <button
                                type="button"
                                className="btn btn-notify-dropdown btn-theme shadow-none">
                                <IconShuffle width="16" height="16"/>
                            </button>
                        </li>

                        {/* recent txn */}
                        <li className="nav-item">
                            <IconBell width="16" height="16" className="dropdown-toggle-icon" />
                        </li>

                        {/* color scheme */}
                        <li className="nav-item">
                            <button type="button" className="btn btn-notify-dropdown btn-theme shadow-none mx-2">
                                <IconSun width="16" height="16"/>
                            </button>
                        </li>

                        {/* sign out */}
                        <li className="nav-item">
                            <button 
                                type="button" 
                                className="btn btn-sign-out mx-2">
                                Sign Out
                            </button>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
    )
}

export default TopBar;