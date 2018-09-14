import Home from './Home'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    SimpleStorage: state.contracts.SimpleStorage,
    TutorialToken: state.contracts.TutorialToken,
    ETH_Oracle: state.contracts.ETH_Oracle,
    VIX_Oracle: state.contracts.VIX_Oracle,
    SPX_Oracle: state.contracts.SPX_Oracle,
    BTC_Oracle: state.contracts.BTC_Oracle,
    SwapMarket: state.contracts.SwapMarket,
    drizzleStatus: state.drizzleStatus
  }
}

const HomeContainer = drizzleConnect(Home, mapStateToProps);

Home.contextTypes = {
  drizzle: PropTypes.object
}

export default HomeContainer
