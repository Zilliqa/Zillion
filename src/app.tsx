import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Home from './components/home';
import Dashboard from './components/dashboard';
import Notlogin from './components/notlogin';

import { AppProvider } from './contexts/appContext';

function App() {
  return (
    <AppProvider>
      <Switch>
        <Route exact path="/" render={(props) => <Home {...props} />} />
        <Route exact path="/dashboard" render={(props) => <Dashboard {...props}/>} />
        <Route exact path="/notlogin" render={(props) => <Notlogin {...props}/>} />
      </Switch>
    </AppProvider>
  );
}

export default App;
