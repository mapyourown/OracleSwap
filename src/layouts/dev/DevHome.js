import React, { Component } from 'react'
import { 
  // AccountData,
  ContractData,
  ContractForm,
   } from 'drizzle-react-components'
import ShowPNLForm from './../ShowPNL/ShowPNLForm.js'
import RatesForm from './../Rates/RatesForm.js'
import Book from './../../../build/contracts/Book.json'
//import logo from '../../logo.png'


class DevHome extends Component {

  constructor(props, context) {
    super(props);
    console.log(props);
    console.log(context);

    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.handleBookButton = this.handleBookButton.bind(this)
    this.lookupMaker = this.lookupMaker.bind(this)
    this.handleInputChange = this.handleInputChange.bind(this)
    this.increaseMargin = this.increaseMargin.bind(this)
    this.fetchEvents = this.fetchEvents.bind(this)
    this.showMakers = this.showMakers.bind(this)
    this.getTakerSubcontracts = this.getTakerSubcontracts.bind(this)
    this.take = this.take.bind(this)
    this.lpFund = this.lpFund.bind(this)
    this.takerFund = this.takerFund.bind(this)
    this.addSubcontract = this.addSubcontract.bind(this)
    this.lookupBook = this.lookupBook.bind(this)
    this.bookIterate = this.bookIterate.bind(this)
    this.bookPopulate = this.bookPopulate.bind(this)

    this.state = {
      makerAddress: '',
      makerBookAddress: '',
      toIncrease: 0,
      takeMakerAddress: '',
      takerIsLong: true,
      takeAmount: 0,
      lpFundMaker: '',
      lpFundAmount: 0,
      takerFundAmount: 0,
      takerFundMaker: '',
      takerFundID: '',
      bookAddress: ''
    }

    this.bookSubcontractKeys = {}
    this.takerTradeEvents = []
    this.takerSubcontractKeys = {}
    this.activeMakers = []
    this.activeMakerBookKeys = {}
    this.activeMakerRateKeys = {}
    this.activeMakerMarginKeys = {}
    this.activeMakerBookDataKeys = {}
  }


  /* handlesetbutton() {
    // If Drizzle is initialized (and therefore web3, accounts and contracts), continue.
    if (state.drizzleStatus.initialized) {
        // Declare this call to be cached and synchronized. We'll receive the store key for recall.
        const dataKey = this.drizzle.contracts.SimpleStorage.methods.storedData.cacheCall()
        console.log('datakey', dataKey)
        // Use the dataKey to display data from the store.
        var response = state.contracts.SimpleStorage.storedData[dataKey].value
        console.log('value', response)
    }

    // If Drizzle isn't initialized, display some loading indication.
    return 'Loading...'
  } */

  handleBookButton() {
    // Assuming we're observing the store for changes
    var state = this.drizzle.store.getState()
    console.log('state', state)
    console.log('props', this.props)
    
    if (state.drizzleStatus.initialized) {
      var key = this.drizzle.contracts.SwapMarket.methods.getBookData.cacheCall(this.state.makerBookAddress)
      this.bookKey = key;
    }
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  lookupBook() {
    /*const web3 = this.drizzle.web3
    const bookweb3 = new web3.eth.Contract(Book.abi, this.state.bookAddress)
    console.log('web3', bookweb3);
    var iter;
    bookweb3.methods.head().call(function (error, result) {
      console.log(result);
      iter = result;
    });*/
    var config = {
      contractName: 'Book',
      web3Contract: new this.drizzle.web3.eth.Contract(Book.abi, this.state.bookAddress)
    }
    this.drizzle.addContract(config)
    this.drizzle.contracts.Book.methods.head().call().then(function (result) {
      var iter = result;
      console.log('head', iter)
      this.bookIterate(iter, []);
    }.bind(this))
    /*var key = this.drizzle.contracts.Book.methods.head.cacheCall()
    console.log('key', key);
    var state = this.drizzle.store.getState()
    if (state.drizzleStatus.initialized) {
      var iter = state.contracts.Book.head[key]
      console.log(iter)
    }*/
  }

  bookIterate(iter, ids) {
    if (iter === "0x0000000000000000000000000000000000000000000000000000000000000000")
    {
      this.bookPopulate(ids)
      return;
    }
    ids.push(iter)
    this.drizzle.contracts.Book.methods.getNode(iter).call().then(function (result) {
      var nextIter = result.next;
        console.log('in iterate',nextIter);
        this.bookIterate(nextIter, ids)
    }.bind(this));
  }

  async bookPopulate (ids) {
    for (const id of ids) {
      const key = await this.drizzle.contracts.Book.methods.getSubcontract.cacheCall(id)
      this.bookSubcontractKeys[id] = key
    }
  }


  take() {
    var state = this.drizzle.store.getState()
    var amount = this.drizzle.web3.utils.toWei(this.state.takeAmount, 'ether')
    if (state.drizzleStatus.initialized) {
      var stackID = this.drizzle.contracts.SwapMarket.methods.take.cacheSend(this.state.takeMakerAddress, this.state.takeAmount, this.state.takerIsLong, {value: amount})
      console.log('stackID', stackID)
    }
  }

  takerFund() {
    var state = this.drizzle.store.getState()
    var amount = this.drizzle.web3.utils.toWei(this.state.takerFundAmount, 'ether')
    if (state.drizzleStatus.initialized) {
      var stackID = this.drizzle.contracts.SwapMarket.methods.takerFund.cacheSend(this.state.takerFundMaker, this.state.takerFundID, {value: amount})
      console.log('stackID', stackID)
    }
  }

  lpFund() {
    var state = this.drizzle.store.getState()
    var amount = this.drizzle.web3.utils.toWei(this.state.lpFundAmount, 'ether')
    if (state.drizzleStatus.initialized) {
      var stackID = this.drizzle.contracts.SwapMarket.methods.lpFund.cacheSend(this.state.lpFundMaker, {value: amount})
      console.log('stackID', stackID)
    }
  }

  getTakerSubcontracts() {
    const web3 = this.drizzle.web3
    const swapcontract = this.drizzle.contracts.SwapMarket
    const contractweb3 = new web3.eth.Contract(swapcontract.abi, swapcontract.address);
    //console.log(contractweb3)
    const takerAddr = this.props.accounts[0];
    contractweb3.getPastEvents(
      'OrderTaken', 
      {
        filter: {taker:takerAddr},
        fromBlock: 0,
        toBlock: 'latest'
      }
    ).then(function(events) { 
      console.log(events)
      events.forEach(function(element) {
        this.addSubcontract(element.returnValues._maker, element.returnValues.id)
      }, this);
    }.bind(this));
  }

  addSubcontract(_maker, _id){
    var keyID = this.drizzle.contracts.SwapMarket.methods.getSubcontractData.cacheCall(_maker, _id)
    this.takerSubcontractKeys[_id] = {key: keyID, maker: _maker}
  }

  showMakers() {
    var makers = []
    var bookKeys = {}
    var rateKeys = {}
    var marginKeys = {}
    var bookDataKeys = {}
    const web3 = this.drizzle.web3;
    const swapcontract = this.drizzle.contracts.SwapMarket;
    const contractweb3 = new web3.eth.Contract(swapcontract.abi, swapcontract.address);
    contractweb3.getPastEvents(
      'OpenMargin', //'allEvents',
      {
         fromBlock: 0,
         toBlock: 'latest'
      }
    ).then(function (events) {
      //console.log(this)
      events.forEach(function(element) {
        var maker = element.returnValues._maker
        if (!makers.includes(maker)) {
          makers.push(maker)
        }
        makers.forEach(function(maker) {
          var key = this.drizzle.contracts.SwapMarket.methods.books.cacheCall(maker)
          bookKeys[maker] = key
        }, this);
        makers.forEach(function(maker) {
          var key = this.drizzle.contracts.SwapMarket.methods.rates.cacheCall(maker)
          rateKeys[maker] = key
        }, this);
        makers.forEach(function(maker) {
          var key = this.drizzle.contracts.SwapMarket.methods.openMargins.cacheCall(maker)
          marginKeys[maker] = key
        }, this);
        makers.forEach(function(maker) {
          var key = this.drizzle.contracts.SwapMarket.methods.getBookData.cacheCall(maker)
          bookDataKeys[maker] = key
        }, this);
      }, this);
    }.bind(this));
    
    this.activeMakers = makers
    this.activeMakerBookKeys = bookKeys
    this.activeMakerRateKeys = rateKeys
    this.activeMakerMarginKeys = marginKeys
    this.activeMakerBookDataKeys = bookDataKeys
  }

  fetchEvents() {
    /*this.drizzle.contracts.SwapMarket.events.OpenMargin({
      //filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
      fromBlock: 0
      }, function(error, event){ console.log(event); })
      .on('data', function(event){
          console.log(event); // same results as the optional callback above
      })
      .on('changed', function(eevent){
          // remove event from local database
      })
      .on('error', console.error); */

    const web3 = this.drizzle.web3;
    const swapcontract = this.drizzle.contracts.SwapMarket;
    const contractweb3 = new web3.eth.Contract(swapcontract.abi, swapcontract.address);
    contractweb3.getPastEvents(
      'OpenMargin', //'allEvents',
      {
         fromBlock: 0,
         toBlock: 'latest'
      }
    ).then(function (events) {
      console.log(events)
    });
  }

  lookupMaker() {
    var state = this.drizzle.store.getState()
    console.log('state', state)
    console.log('props', this.props)

    if (state.drizzleStatus.initialized) {
      this.ratesKey = this.drizzle.contracts.SwapMarket.methods.rates.cacheCall(this.state.makerAddress)
      this.bookKey = this.drizzle.contracts.SwapMarket.methods.books.cacheCall(this.state.makerAddress)
    }

    console.log('updated', this.props.SwapMarket);
  }

  increaseMargin() {
    var state = this.drizzle.store.getState()
    var amount = this.drizzle.web3.utils.toWei(this.state.toIncrease, 'ether')
    console.log('amount', state)
    
    if (state.drizzleStatus.initialized) {
      var stackID = this.drizzle.contracts.SwapMarket.methods.increaseOpenMargin.cacheSend(amount, {value: amount})
      console.log('stackID', stackID)
    }
  }

  render() {

    /*var rates = 'Input Address'
    if(this.ratesKey in this.props.SwapMarket.rates) {
      //console.log('rates', this.props.SwapMarket.getMakerRates[this.ratesKey])
      var items = this.props.SwapMarket.rates[this.ratesKey].value
      this.makerState.long = items["currentLong"]
      this.makerState.short = items["currentShort"]
      this.makerState.nLong = items["nextLong"]
      this.makerState.nshort = items["nextShort"]
      this.makerState.updated = true;
      rates = "Long: " + items["longRate"] + "  Short: " + items["shortRate"]
      rates = rates + "  Next Long: "+  items["nextLong"] + "  Next Short: " + items["nextShort"]
      //delete this.ratesKey
      //<span>{rates}</span>
    }*/

    var rates = {}
    if (this.ratesKey in this.props.SwapMarket.rates) {
      rates = this.props.SwapMarket.rates[this.ratesKey].value
    }

    var book = ''
    if (this.bookKey in this.props.SwapMarket.books) {
      book = this.props.SwapMarket.books[this.bookKey].value
    }

    var takerSubcontracts = {}
    Object.keys(this.takerSubcontractKeys).forEach(function (id) {
      takerSubcontracts[id] = {}
      if (this.takerSubcontractKeys[id].key in this.props.SwapMarket.getSubcontractData)
      {
          takerSubcontracts[id] = this.props.SwapMarket.getSubcontractData[this.takerSubcontractKeys[id].key].value
          takerSubcontracts[id].maker = this.takerSubcontractKeys[id].maker
      }

    }, this);

    var activeBooks = {}
    Object.keys(this.activeMakerBookKeys).forEach(function (maker) {
      activeBooks[maker] = {}
      if (this.activeMakerBookKeys[maker] in this.props.SwapMarket.books) 
        activeBooks[maker].bookAddress = this.props.SwapMarket.books[this.activeMakerBookKeys[maker]].value
      if (this.activeMakerRateKeys[maker] in this.props.SwapMarket.rates) 
        activeBooks[maker].rates = this.props.SwapMarket.rates[this.activeMakerRateKeys[maker]].value
      if (this.activeMakerMarginKeys[maker] in this.props.SwapMarket.openMargins) 
        activeBooks[maker].margin = this.props.SwapMarket.openMargins[this.activeMakerMarginKeys[maker]].value
      if (this.activeMakerBookDataKeys[maker] in this.props.SwapMarket.getBookData)
        activeBooks[maker].bookData = this.props.SwapMarket.getBookData[this.activeMakerBookDataKeys[maker]].value
    }, this);

    var bookSubcontracts = {}
    var state = this.drizzle.store.getState()
    Object.keys(this.bookSubcontractKeys).forEach(function (id) {
      var key = this.bookSubcontractKeys[id]
      if (state.contracts.Book)
      {
        if (key in state.contracts.Book.getSubcontract)
          bookSubcontracts[id] = (state.contracts.Book.getSubcontract[key].value)
      }
    }, this)
    //console.log(bookSubcontracts)
      

    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1 header">
            <h1>Smart Contract Interface</h1>
          </div>

          <div className="pure-u-1-1">
            <h2>All LPs</h2>
            <DisplayMakers activeMakers={this.activeMakers}/>
            <DisplayActiveBooks activeBooks={activeBooks} />
            <button className="pure-button" type="button" onClick={this.showMakers}> Show All LPs</button>
          </div>

          <div className="pure-u-1-1">
            <h2>Maker Info</h2> 
            <RatesForm />
            <DisplayBookAddress book={book} />
            <DisplayRates2 rates={rates} />
            <form className="pure-form pure-form-stacked">
              <input name="makerAddress" type="text" value={this.state.makerAddress} onChange={this.handleInputChange} placeholder="Address" />
              <button className="pure-button" type="button" onClick={this.lookupMaker}>Lookup</button>
            </form>
            <br/>
          </div>

          <div className="pure-u-1-1">
            <h2>Book info</h2>
            <form className="pure-form pure-form-stacked">
              <input name="makerBookAddress" type="text" value={this.state.makerBookAddress} onChange={this.handleInputChange} placeholder="Address" />
              <button className="pure-button" type="button" onClick={this.handleBookButton}> Maker Book Info </button>
            </form>
          </div>

          <div className="pure-u-1-1">
            <h2>Oracle Operations</h2>
            <h3>ETH Oracle </h3>
            <p><strong>Price: </strong><ContractData contract="ETH_Oracle" method="getPrice" methodArgs={[{from: this.props.accounts[0]}]}/></p>
            <p><strong>Day: </strong><ContractData contract="ETH_Oracle" method="currentDay"/></p>
            <p><strong>Last Wednesday: </strong><ContractData contract="ETH_Oracle" method="lastPrice" /></p>
            <p>New Daily Price: </p>
            <ContractForm contract="ETH_Oracle" method="setIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Final Intraweek Price (Tuesday Price) </p>
            <ContractForm contract="ETH_Oracle" method="setFinalIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Wednesday Settle Price </p>
            <ContractForm contract="ETH_Oracle" method="weeklySettlePrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>Wednesday Settle Price, new basis included </p>
            <ContractForm contract="ETH_Oracle" method="weeklySettlePriceWithBasis" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>SPX Oracle </h3>
            <p><strong>Price: </strong><ContractData contract="SPX_Oracle" method="getPrice" methodArgs={[{from: this.props.accounts[0]}]}/></p>
            <p><strong>Day: </strong><ContractData contract="SPX_Oracle" method="currentDay"/></p>
            <p><strong>Last Wednesday: </strong><ContractData contract="SPX_Oracle" method="lastPrice" /></p>
            <p>New Daily Price: </p>
            <ContractForm contract="SPX_Oracle" method="setIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Final Intraweek Price (Tuesday Price) </p>
            <ContractForm contract="SPX_Oracle" method="setFinalIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Wednesday Settle Price </p>
            <ContractForm contract="SPX_Oracle" method="weeklySettlePrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>VIX Oracle </h3>
            <p><strong>Price: </strong><ContractData contract="VIX_Oracle" method="getPrice" methodArgs={[{from: this.props.accounts[0]}]}/></p>
            <p><strong>Day: </strong><ContractData contract="VIX_Oracle" method="currentDay"/></p>
            <p><strong>Last Wednesday: </strong><ContractData contract="VIX_Oracle" method="lastPrice" /></p>
            <p>New Daily Price: </p>
            <ContractForm contract="VIX_Oracle" method="setIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Final Intraweek Price (Tuesday Price) </p>
            <ContractForm contract="VIX_Oracle" method="setFinalIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Wednesday Settle Price </p>
            <ContractForm contract="VIX_Oracle" method="weeklySettlePrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>BTC Oracle </h3>
            <p><strong>Price: </strong><ContractData contract="BTC_Oracle" method="getPrice" methodArgs={[{from: this.props.accounts[0]}]}/></p>
            <p><strong>Day: </strong><ContractData contract="BTC_Oracle" method="currentDay"/></p>
            <p><strong>Last Wednesday: </strong><ContractData contract="BTC_Oracle" method="lastPrice" /></p>
            <p>New Daily Price: </p>
            <ContractForm contract="BTC_Oracle" method="setIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Final Intraweek Price (Tuesday Price) </p>
            <ContractForm contract="BTC_Oracle" method="setFinalIntraweekPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <p>New Wednesday Settle Price </p>
            <ContractForm contract="BTC_Oracle" method="weeklySettlePrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>Pause All Contracts</h3>
            <ContractForm contract="SwapMarket" method="pause" sendArgs={{from: this.props.accounts[0]}}/>
          </div>

          <div className="pure-u-1-1">
            <h2>Settlement Functions</h2>
            <h3>1. First Price</h3>
            <ContractForm contract="SwapMarket" method="firstPrice" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>2. Calculate Returns</h3>
            <ContractForm contract="SwapMarket" method="computeReturns" sendArgs={{from: this.props.accounts[0]}}/>
            <h3>3. Settle Liquidity Provider</h3>
            <ContractForm contract="SwapMarket" method="settle" sendArgs={{from: this.props.accounts[0]}}/>
          </div>

          <div className="pure-u-1-1">
            <h2>Market Info</h2>
            <p><strong>Admin</strong>: <ContractData contract="SwapMarket" method="admin" /></p>
            <p><strong>Minumum Required Margin</strong>: <ContractData contract="SwapMarket" method="minRM" /> Wei</p>
            <p><strong>Open Fee</strong>: <ContractData contract="SwapMarket" method="openFee" /></p>
            <p><strong>Cancel Fee</strong>: <ContractData contract="SwapMarket" method="cancelFee" /></p>
            <p><strong>Burn Fee</strong>: <ContractData contract="SwapMarket" method="burnFee" /></p>
          </div>

          <div className="pure-u-1-1">
            <h2>Book Summary</h2> 
            <DisplaySubcontracts subcontracts={bookSubcontracts} />
            <form className="pure-form pure-form-stacked">
              <input name="bookAddress" type="text" value={this.state.bookAddress} onChange={this.handleInputChange} placeholder="Book Address" />
              <button className="pure-button" type="button" onClick={this.lookupBook}>Lookup</button>
            </form>
            <br/>
          </div>

          <div className="pure-u-1-1">
            <h2>Make</h2>
            <p>Add open margin</p>
            <form className="pure-form pure-form-stacked">
              <input name="toIncrease" type="number" value={this.state.toIncrease} onChange={this.handleInputChange} placeholder="amount in ETH" />
              <button className="pure-button" type="button" onClick={this.increaseMargin}>Add Value</button>
            </form>
            <br/>
            <p>Reduce open margin</p>
            <ContractForm contract="SwapMarket" method="reduceOpenMargin" />
            <br/>
            <p>Update Rates</p>
            <ContractForm contract="SwapMarket" method="setRate" labels={["New Long Rate", "New Short Rate"]} />
            <br/>
            <p>Add margin to a Book:</p>
            <label>Maker: 
                <input name="lpFundMaker" type="text" value={this.state.lpFundMaker} onChange={this.handleInputChange} />
            </label>
            <br/>
            <label>Amount (in ETH): 
                <input name="lpFundAmount" type="number" value={this.state.lpFundAmount} onChange={this.handleInputChange} />
            </label>
            <br/>
            <button className="pure-button" type="button" onClick={this.lpFund}>Send Funds</button>
          </div>

          <div className="pure-u-1-1">
            <h2>Taker Info</h2>
            <DisplaySubcontracts subcontracts={takerSubcontracts} />
            <button className="pure-button" type="button" onClick={this.getTakerSubcontracts}>Show My Taken Contracts</button>
            <p>Add margin to a Subcontract:</p>
            <label>LP: 
                <input name="takerFundMaker" type="text" value={this.state.takerFundMaker} onChange={this.handleInputChange} />
            </label>
            <br/>
            <label>Subcontract ID: 
                <input name="takerFundID" type="text" value={this.state.takerFundID} onChange={this.handleInputChange} />
            </label>
            <br/>
            <label>Amount (in ETH): 
                <input name="takerFundAmount" type="number" value={this.state.takerFundAmount} onChange={this.handleInputChange} />
            </label>
            <br/>
            <button className="pure-button" type="button" onClick={this.takerFund}>Send Funds</button>
          </div>

          <div className="pure-u-1-1">
            <h2>Take</h2>
            <form className="pure-form pure-form-stacked">
              <label> Maker Address: 
                <input name="takeMakerAddress" type="text" value={this.state.takeMakerAddress} onChange={this.handleInputChange} placeholder="Address" />
              </label>
              <label>Amount in ETH:
                <input name="takeAmount" type="number" value={this.state.takeAmount} onChange={this.handleInputChange} placeholder="amount in ETH" />
              </label>
              <label>Long: 
                <input name="takerIsLong" type="checkbox" checked={this.state.takerIsLong} onChange={this.handleInputChange} />
              </label>
              <button className="pure-button" type="button" onClick={this.take}>Take</button>
            </form>
          </div>

          <div className="pure-u-1-1">
            <h2>Current PNL</h2>
            <ShowPNLForm />
          </div>

          <div className="pure-u-1-1">
            <h2>Trade Interactions</h2>
            <p>Cancel </p>
            <ContractForm contract="SwapMarket" method="playerCancel" sendArgs={{value: 1000000000000000000}} />
            <br/>
            <p>Burn</p>
            <ContractForm contract="SwapMarket" method="playerBurn" />
          </div>

          <div className="pure-u-1-1">
            <h2>Remove Excess margins</h2>
            <p>LP</p>
            <ContractForm contract="SwapMarket" method="ownerMarginWithdrawal" />
            <br/>
            <p>Taker</p>
            <ContractForm contract="SwapMarket" method="takerWithdrawal" />
            <br/>
            <p>Collect Balance </p>
            <ContractForm contract="SwapMarket" method="collectBalance" />
          </div>

          <div className="pure-u-1-1">
            <h2>Change Book Owner</h2>
            <ContractForm contract="SwapMarket" method="changeOwner" />
          </div>
          
        </div>
      </main>
    )
  }
}

function DisplayMakers(props) {
  const listitems = props.activeMakers.map((maker) =>
    <li key={maker.toString()}>
      <span>{maker}</span>
    </li>
  );
  return (
    <ul>{listitems}</ul>
  );
}

function DisplaySubcontracts(props) {
  const listitems = Object.keys(props.subcontracts).map( function(id) {
    var side;
    var rmAmount = props.subcontracts[id].reqMargin/1e18;
    var takerMarginAmount = props.subcontracts[id].takerMargin/1e18;
    var status = "Ongoing";
    if (props.subcontracts[id].side)
      side = "Long"
    else
      side = "Short"

    if (props.subcontracts[id].isCancelled)
      status = "Cancelled"
    if (props.subcontracts[id].isBurned)
      status = "Burned"

    return(
        <li key={id.toString()}>
          <p>Subcontract ID: {id}</p>
          <p>Required Margin: {rmAmount}</p>
          <p>LP: {props.subcontracts[id].maker}</p>
          <p>Taker: {props.subcontracts[id].taker}</p>
          <p>Required Margin: {rmAmount}</p>
          <p>Taker Margin: {takerMarginAmount}</p>
          <p>LP Side: {side}</p>
          <p>First Day ID: {props.subcontracts[id].initialDay}</p>
          <p>Status: {status}</p>
        </li>
      );
  });
  return (
    <ul>{listitems}</ul>
  );
}

function DisplayActiveBooks(props) {
  const listitems = Object.keys(props.activeBooks).map( function(maker)  {
    if (props.activeBooks[maker].bookAddress && props.activeBooks[maker].rates
     && props.activeBooks[maker].margin && props.activeBooks[maker].bookData)
    {
      // TODO: Not all margin is availble, display
      return(
        <li key={maker.toString()}>
          <p>LP: {maker}</p>
          <p>Book: {props.activeBooks[maker].bookAddress}</p>
          <p>Open Margin: {props.activeBooks[maker].margin/(1e18)} ETH</p>
          <p>Current Long Rate: {props.activeBooks[maker].rates['currentLong']}</p>
          <p>Current Short Rate: {props.activeBooks[maker].rates['currentShort']}</p>
          <p>Next Long Rate: {props.activeBooks[maker].rates['nextLong']}</p>
          <p>Next Short Rate: {props.activeBooks[maker].rates['nextShort']}</p>
          <p>Current Long Margin: {props.activeBooks[maker].bookData['totalLong']/(1e18)} ETH</p>
          <p>Current Short Margin: {props.activeBooks[maker].bookData['totalShort']/(1e18)} ETH</p>
        </li>
      );
    }
    else
      return (
        <span key='empty'>waiting...</span>
      );
  });
  return (
    <ul>{listitems}</ul>
  );
}

function DisplaySubcontractPNL(props) {
  var side;
  var status = 'Ongoing'
  if (props.subcontract.side)
    side = "Long"
  else
    side = "Short"

  if (props.subcontract.isCancelled)
    status = "Cancelled"
  if (props.subcontract.isBurned)
    status = "Burned"

  var rmAmount = props.subcontract.reqMargin/1e18;
  var takerMarginAmount = props.subcontract.takerMargin/1e18;

  // Settle computation
  var usdReturn = props.asset.currentPrice*1.0/props.asset.dailyPrices[props.subcontract.initialDay] - 1
  var ethReturn = (usdReturn * props.eth.dailyPrices[props.subcontract.initialDay])/props.eth.currentPrice
  var pnl;
  if (props.subcontract.side)
  {
    pnl = ethReturn + props.asset.Basis*(1.0/1000)*rmAmount + props.rates.currentShort*(1.0/1000)*rmAmount
  }
  else
  {
    pnl = -1.0* (ethReturn + props.asset.Basis*(1.0/1000)*rmAmount) + props.rates.currentLong*(1.0/1000)*rmAmount
  }

  return (
    <div>
      <p>LP: {props.subcontract.maker}</p>
      <p>Subcontract ID: {props.subcontract.id}</p>
      <p>Required Margin: {rmAmount}</p>
      <p>Taker: {props.subcontract.taker}</p>
      <p>Taker Margin: {takerMarginAmount}</p>
      <p>LP Side: {side}</p>
      <p>First Day ID: {props.subcontract.initialDay}</p>
      <p>Status: {status}</p>
      <p>LP PNL: {pnl}</p>
      <p>Taker PNL: {-1.0 * pnl} </p>
    </div>
  );
}

function DisplayBookPNL(props) {
  const listitems = Object.keys(props.subcontracts).map(function (id) {
    var side;
    var rmAmount = props.subcontracts[id].reqMargin/1e18;
    var takerMarginAmount = props.subcontracts[id].takerMargin/1e18;
    var status = "Ongoing";
    if (props.subcontracts[id].side)
      side = "Long"
    else
      side = "Short"

    if (props.subcontracts[id].isCancelled)
      status = "Cancelled"
    if (props.subcontracts[id].isBurned)
      status = "Burned"

    return (
      <li key={id.toString()}>
        <p>ID: {id}</p>
        <p>Taker: {props.subcontracts[id].taker}</p>
        <p>Required Margin: {props.subcontracts[id].reqMargin}</p>
        <p>Taker Margin: {props.subcontracts[id].takerMargin}</p>
        <p>Start Day: {props.subcontracts[id].initialDay}</p>
        <p>LP side: {props.subcontracts[id].side}</p>
      </li>
    );
  });
  return (
    <ul>{listitems}</ul>
  );
}

function DisplayBookAddress(props) {
  const addr = props.book
  if (addr)
  {
    return (
      <div>
        <p>Book Address: {addr}</p>
      </div>
    );
  }
  else
  {
    return (
      <div>
        <span>No book Data</span>
      </div>
    );
  }
}

function DisplayRates2(props) {
  //console.log('props', props)
  const rateList = props.rates;
  if (Object.keys(rateList).length !== 0)
  {
    //console.log(rateList);
    return (
      <div>
        <p>Current Long: {rateList['currentLong']}</p>
        <p>Current Short: {rateList['currentShort']}</p>
        <p>Next Long: {rateList['nextLong']}</p>
        <p>Next Short: {rateList['nextShort']}</p>
      </div>
    );
  }
  else
  {
    return (
      <div>
        <span>No Rate Data</span>
      </div>
    );
  }
}
export default DevHome
