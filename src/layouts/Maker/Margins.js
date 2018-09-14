import React, { Component } from 'react'

class Margins extends Component {
  constructor(props, context) {
    super(props);
    //console.log(props)
    //console.log(context)
    this.contracts = context.drizzle.contracts
    this.marginKey = this.contracts.SwapMarket.methods.openMargins.cacheCall(this.props.account)
    this.state = {
      toIncrease: '',
      toDecrease: ''
    }

    this.handleInputChange = this.handleInputChange.bind(this)
    this.increaseMargin = this.increaseMargin.bind(this)
    this.decreaseMargin = this.decreaseMargin.bind(this)
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  increaseMargin() {
    var amount = this.state.toIncrease*1e18
    var stackID = this.contracts.SwapMarket.methods.increaseOpenMargin.cacheSend(amount, {value: amount})
    console.log('stackID', stackID)
    this.setState({toIncrease: ''})
  }

  decreaseMargin() {
    var amount = this.state.toDecrease*1e18
    var stackID = this.contracts.SwapMarket.methods.reduceOpenMargin.cacheSend(amount)
    console.log('stackID', stackID)
    this.setState({toDecrease: ''})
  }

  render() {
    // If the data isn't here yet, show loading
    if(!(this.marginKey in this.props.contracts.SwapMarket.openMargins)) {
      return (
        <span>Loading...</span>
      )
    }

    // If the data is here, get it and display it
    var data = this.props.contracts.SwapMarket.openMargins[this.marginKey].value/1e18
    var pendingSpinner = this.props.contracts.SwapMarket.synced ? '' : ' 🔄'
    
    return (
      <div>
        <strong>Current Open Margin </strong> {data}{pendingSpinner}
        <br/>
        <p>Add open margin</p>
        <form className="pure-form pure-form-stacked">
          <input name="toIncrease" type="number" value={this.state.toIncrease} onChange={this.handleInputChange} placeholder="amount in ETH" />
          <button className="pure-button" type="button" onClick={this.increaseMargin}>Add Value</button>
        </form>
        <br/>
        <p>Reduce open margin</p>
        <form className="pure-form pure-form-stacked">
          <input name="toDecrease" type="number" value={this.state.toDecrease} onChange={this.handleInputChange} placeholder="amount in ETH" />
          <button className="pure-button" type="button" onClick={this.decreaseMargin}>Decrease</button>
        </form>
        <br/>
      </div>
    )
  }
}

export default Margins
//<ContractData contract="SwapMarket" method="openMargins" methodArgs={[this.props.account]} />
/*Margins.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    contracts: state.contracts
  }
}

export default drizzleConnect(Margins, mapStateToProps) */
