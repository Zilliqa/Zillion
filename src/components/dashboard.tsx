import React from 'react';

function Dashboard(props: any) {

    const {authContext} = props;
    const { isAuthenticated } = authContext;

    return (
        <>
            <h1>Dashboard</h1>
            { isAuthenticated ? 
                <p>Is Authenticated: {String(isAuthenticated)}</p>
            : 
                <p>Not authenticated.</p>
            }
        </>
    );
}

export default Dashboard;