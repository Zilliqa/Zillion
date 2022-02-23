import React, { useState } from 'react';
import DashboardMainView from './main-view';
import StakingView from './staking-view';
import TopBar from './topbar';

function Dashboard2(props:any) {
    const [activeTab, setActiveTab] = useState('home'); // home, staking

    return (
        <div id="wrapper">
            {/* topbar */}
            <TopBar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} />
            {/* sidebar */}
            {/* main */}
            {
                activeTab === 'home' &&
                <DashboardMainView />
            }
            {
                activeTab === 'staking' &&
                <StakingView />
            }
        </div>
    )
}

export default Dashboard2