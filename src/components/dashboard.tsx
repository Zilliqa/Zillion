import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from "../contexts/authContext";
import * as Account from "../account";

function Dashboard(props: any) {

    const authContext = useContext(AuthContext);
    const { isAuthenticated, address } = authContext;
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        console.log("dashboard use effect running");
        console.log("address: %o", address);
        (async () => {
            const balance = await Account.getBalance(address);
            setBalance(balance);
        })();
    }, [address]);

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