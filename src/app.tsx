import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import Home from './components/home';
import Dashboard from './components/dashboard';
import Notlogin from './components/notlogin';
import Error404 from './components/error404';
import Explorer from './components/explorer';

import { AppProvider } from './contexts/appContext';


function App() {
  return (
    <AppProvider>
      <Switch>
        <Route exact path="/" render={(props) => <Home {...props} />} />
        <Route exact path="/address/:address" render={(props) => < Explorer {...props} />} />
        <Route exact path="/dashboard" render={(props) => <Dashboard {...props}/>} />
        <Route exact path="/notlogin" render={(props) => <Notlogin {...props}/>} />
        <Route exact path="/oops" render={(props) => <Error404 {...props}/>} />
        <Route>
          {/* No route match - redirect to home page */}
          <Redirect to="/" />
        </Route>
      </Switch>
    </AppProvider>
  );
}

export default App;
