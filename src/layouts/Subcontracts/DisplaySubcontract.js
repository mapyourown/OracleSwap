import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { drizzleConnect } from 'drizzle-react'

class DisplaySubcontracts extends Component {
  constructor(props, context) {
    super(props);
    console.log(props)
  }
  render() {
    const listitems = Object.keys(this.props.subcontracts).map( function(id) {
    var side;
    var rmAmount = this.props.subcontracts[id].reqMargin/1e18;
    var takerMarginAmount = this.props.subcontracts[id].takerMargin/1e18;
    var status = "Ongoing";
    if (this.props.subcontracts[id].side)
      side = "Long"
    else
      side = "Short"

    if (this.props.subcontracts[id].isCancelled)
      status = "Cancelled"
    if (this.props.subcontracts[id].isBurned)
      status = "Burned"

    return(
        <li key={id.toString()}>
          <p>Subcontract ID: {id}</p>
          <p>Required Margin: {rmAmount}</p>
          <p>LP: {this.props.subcontracts[id].maker}</p>
          <p>Taker: {this.props.subcontracts[id].taker}</p>
          <p>Required Margin: {rmAmount}</p>
          <p>Taker Margin: {takerMarginAmount}</p>
          <p>LP Side: {side}</p>
          <p>First Day ID: {this.props.subcontracts[id].initialDay}</p>
          <p>Status: {status}</p>
        </li>
      );
  });
  return (
    <ul>{listitems}</ul>
  );
  }
}

DisplaySubcontracts.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    SwapMarket: state.contracts.SwapMarket
  }
}

export default drizzleConnect(DisplaySubcontracts, mapStateToProps)