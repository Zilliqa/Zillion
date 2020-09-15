import React from 'react';
import NotloginLogo from '../static/notlogin.svg';
import DisclaimerModal from './disclaimer';

function Notlogin(props: any) {

    const directUser = () => {
        props.history.replace("/");
    };

    return (
        <div className="cover">
            <div className="container-fluid">
                <div className="row align-items-center">
                    <div className="cover-content col-12">
                        <div id="unauthenticated-section" className="text-center rounded mx-auto p-4">
                            <img src={NotloginLogo} alt="not-authenticated" width="250" className="mt-2 mb-4" />
                            <h3>Not authenticated</h3>  
                            <p>Sorry, please connect your wallet to continue.</p>
                            <button type="button" className="btn btn-user-action mx-2" onClick={directUser}>Log In</button>
                        </div>
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

export default Notlogin;