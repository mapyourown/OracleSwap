import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
import { DrizzleProvider } from 'drizzle-react'

// Layouts
import App from './App'
import HomeContainer from './layouts/home/HomeContainer'
import MakerHomeContainer from './layouts/Maker/MakerHomeContainer'
import TakerHomeContainer from './layouts/Taker/TakerHomeContainer'
import OracleHomeContainer from './layouts/Oracle/OracleHomeContainer'
import MultiOracleContainer from './layouts/Oracle/MultiOracleContainer'
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
            <IndexRoute component={HomeContainer} />
          </Route>
          <Route path="/make" component={App}>
            <IndexRoute component={MakerHomeContainer} />
          </Route>
          <Route path="/take" component={App}>
            <IndexRoute component={TakerHomeContainer} />
          </Route>
          <Route path="/oracle" component={App}>
            <IndexRoute component={OracleHomeContainer} />
          </Route>
          <Route path="/multi" component={App}>
            <IndexRoute component={MultiOracleContainer} />
          </Route>
        </Router>
      </LoadingContainer>
    </DrizzleProvider>
  ),
  document.getElementById('root')
);

//<IndexRoute component={HomeContainer} />