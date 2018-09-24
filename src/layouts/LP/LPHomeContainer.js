import LPHome from './LPHome'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts,
    /*SimpleStorage: state.contracts.SimpleStorage,
    TutorialToken: state.contracts.TutorialToken,
    ETH_Oracle: state.contracts.ETH_Oracle,
    VIX_Oracle: state.contracts.VIX_Oracle,
    SPX_Oracle: state.contracts.SPX_Oracle,
    BTC_Oracle: state.contracts.BTC_Oracle,
    SwapMarket: state.contracts.SwapMarket,*/
    drizzleStatus: state.drizzleStatus
  }
}

const LPHomeContainer = drizzleConnect(LPHome, mapStateToProps);

LPHome.contextTypes = {
  drizzle: PropTypes.object
}

export default LPHomeContainer
