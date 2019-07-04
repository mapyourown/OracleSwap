import React from 'react'
import ReactDOM from 'react-dom'
import { Router, Route, browserHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
import { DrizzleProvider } from 'drizzle-react'

// Layouts
import App from './App'
import { LoadingContainer } from 'drizzle-react-components'
import CustomLoader from './CustomLoadingContainer'

import routes from './Routes'
import store from './state/store'
import drizzleOptions from './drizzleOptions'

// Initialize react-router-redux.
const history = syncHistoryWithStore(browserHistory, store)

ReactDOM.render((
    <DrizzleProvider options={drizzleOptions} store={store}>
      <LoadingContainer>
        <CustomLoader>
          <App>
              <Router history={history}>
                  {
                      routes.map(({path, component}) =>
                          <Route key={path} path={path} component={component}/>
                      )
                  }
              </Router>
          </App>
        </CustomLoader>
      </LoadingContainer>
    </DrizzleProvider>
  ),
  document.getElementById('root')
)