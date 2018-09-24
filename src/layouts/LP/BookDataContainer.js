import BookData from './BookData'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts
  }
}

const BookDataContainer = drizzleConnect(BookData, mapStateToProps);

BookData.contextTypes = {
  drizzle: PropTypes.object
}

export default BookDataContainer
