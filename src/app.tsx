import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Home from './components/home';
import Dashboard from './components/dashboard';

import { AppProvider } from './contexts/appContext';

function App() {
  return (
    <AppProvider>
      <Switch>
        <Route exact path="/" render={(props) => <Home {...props} />} />
        <Route path="/dashboard" render={(props) => <Dashboard {...props}/>} />
      </Switch>
    </AppProvider>
  );
}

export default App;
