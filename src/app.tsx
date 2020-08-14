import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Home from './components/home';
import Dashboard from './components/dashboard';
import { AuthContext, AuthProvider } from './contexts/authContext';

function App() {
  // authContext is passed to other components as props so that they can be accessible
  // without re-importing and specifying the Consumer tags
  return (
    <AuthProvider>
      <AuthContext.Consumer>
        {(authContext) => {
          return (
            <Switch>
              <Route exact path="/" render={(props) => <Home {...props} authContext={authContext}/>} />
              <Route path="/dashboard" render={(props) => <Dashboard {...props} authContext={authContext}/>} />
            </Switch>
          );
        }}
      </AuthContext.Consumer>
    </AuthProvider>

  );
}

export default App;
