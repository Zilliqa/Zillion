import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from "../contexts/authContext";
import * as StakezAccount from "../stakez-account";

function Dashboard(props: any) {

    const authContext = useContext(AuthContext);
    const { isAuthenticated, address } = authContext;
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        console.log("dashboard use effect running");
        console.log("address: %o", address);
        (async () => {
            const balance = await StakezAccount.getBalance(address);
            setBalance(balance);
        })();
    });

    return (
        <>
            <h1>Dashboard</h1>
            { isAuthenticated ?
                <>
                <p>Address: {address}</p>
                <p>Balance: {balance}</p>
                <p>Is Authenticated: {String(isAuthenticated)}</p>
                </>
            : 
                <p>Not authenticated.</p>
            }
        </>
    );
}

export default Dashboard;