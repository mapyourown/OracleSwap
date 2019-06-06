import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
import { DrizzleProvider } from 'drizzle-react'

// Layouts
import App from './App'
import SplashContainer from './layouts/Splash/SplashContainer'
import MakerHomeContainer from './layouts/LP/LPHomeContainer'
import TakerHomeContainer from './layouts/Taker/TakerHomeContainer'
import OracleHomeContainer from './layouts/Oracle/OracleHomeContainer'
import MultiOracleContainer from './layouts/Oracle/MultiOracleContainer'
import OffersContainer from './layouts/Offers/OffersContainer'
import LPDetailsContainer from './layouts/LP/LPDetailsContainer'
import { LoadingContainer } from 'drizzle-react-components'

import store from './store'
import drizzleOptions from './drizzleOptions'

// Initialize react-router-redux.
const history = syncHistoryWithStore(browserHistory, store)

ReactDOM.render((
    <DrizzleProvider options={drizzleOptions} store={store}>
      <LoadingContainer>
        <Router history={history}>
          <Route path="/" component={App}>
            <IndexRoute component={SplashContainer} />
          </Route>
          <Route path="/make" component={App}>
            <IndexRoute component={MakerHomeContainer} />
          </Route>
          <Route path="/lpdetails" component={App}>
            <IndexRoute component={LPDetailsContainer} />
          </Route>
          <Route path="/offers" component={App}>
            <IndexRoute component={OffersContainer} />
          </Route>
          <Route path="/take" component={App}>
            <IndexRoute component={TakerHomeContainer} />
          </Route>
          <Route path="/oracle" component={App}>
            <IndexRoute component={OracleHomeContainer} />
          </Route>
          <Route path="/admin" component={App}>
            <IndexRoute component={MultiOracleContainer} />
          </Route>
        </Router>
      </LoadingContainer>
    </DrizzleProvider>
  ),
  document.getElementById('root')
);

//<IndexRoute component={HomeContainer} />