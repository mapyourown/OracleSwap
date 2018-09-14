import Margins from './Margins'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts
  }
}

const MarginsContainer = drizzleConnect(Margins, mapStateToProps);

Margins.contextTypes = {
  drizzle: PropTypes.object
}

export default MarginsContainer
