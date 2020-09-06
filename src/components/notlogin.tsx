import React from 'react';
import NotloginLogo from '../static/notlogin.svg';

function Notlogin(props: any) {

    const directUser = () => {
        props.history.replace("/");
    };

    return (
        <div id="unauthenticated-section">
            <div className="container-fluid h-100">
                <div className="row h-100 align-items-center">
                     <div className="content rounded text-center mx-auto p-4">
                        <img src={NotloginLogo} alt="not-authenticated" width="250" className="mt-2 mb-4" />
                        <h3>Not authenticated</h3>  
                        <p>Sorry, please connect your wallet to continue.</p>
                        <button type="button" className="btn btn-user-action mx-2" onClick={directUser}>Okay, show me the login</button>
                    </div>
                </div>
            </div>
        </div>

    );
}

export default Notlogin;