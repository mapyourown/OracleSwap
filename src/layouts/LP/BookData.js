import React, { Component } from 'react'
import Book from './../../../build/contracts/Book.json'

class BookData extends Component {
  constructor(props, context) {
    super(props);
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.bookKey = this.contracts.SwapMarket.methods.books.cacheCall(this.props.account)
    this.lookupBook = this.lookupBook.bind(this)
    this.bookIterate = this.bookIterate.bind(this)
    this.bookPopulate = this.bookPopulate.bind(this)

    this.bookSubcontractKeys = {}
    this.bookLPMarginKey = ''

    this.state = {
      bookAddress: '',
      test: '',
      bookStatus: ''
    }
  }

  lookupBook() {
    //console.log(this.props.contracts.SwapMarket)
    if(!(this.bookKey in this.props.contracts.SwapMarket.books))
      return
    this.setState({bookStatus: 'Retrieving Data'})

    var config = {
      contractName: 'Book',
      web3Contract: new this.drizzle.web3.eth.Contract(Book.abi, this.props.contracts.SwapMarket.books[this.bookKey].value)
    }
    this.drizzle.addContract(config)
    this.drizzle.contracts.Book.methods.head().call().then(function (result) {
      var iter = result;
      this.bookIterate(iter, []);
    }.bind(this))
    const marginKey = this.drizzle.contracts.Book.methods.lpMargin.cacheCall()
    this.bookLPMarginKey = marginKey
  }

  bookIterate(iter, ids) {
    if (iter === "0x0000000000000000000000000000000000000000000000000000000000000000")
    {
      this.bookPopulate(ids)
      this.setState({bookStatus: 'Data Retreived'})
      return;
    }
    ids.push(iter)
    this.drizzle.contracts.Book.methods.getNode(iter).call().then(function (result) {
      var nextIter = result.next;
        this.bookIterate(nextIter, ids)
    }.bind(this));
  }

  async bookPopulate (ids) {
    for (const id of ids) {
      const key = await this.drizzle.contracts.Book.methods.getSubcontract.cacheCall(id)
      this.bookSubcontractKeys[id] = key
      this.setState({test: 'finished pop'})
    }
  }

  render() {

    var bookSubcontracts = {}
    var state = this.drizzle.store.getState()
    Object.keys(this.bookSubcontractKeys).forEach(function (id) {
      var key = this.bookSubcontractKeys[id]
      if (state.contracts.Book)
      {
        if (key in state.contracts.Book.getSubcontract)
        {
          bookSubcontracts[id] = (state.contracts.Book.getSubcontract[key].value)
          bookSubcontracts[id].maker = this.props.account
        }

      }
    }, this)

    // If the data isn't here yet, show loading
    if(!(this.bookKey in this.props.contracts.SwapMarket.books)) {
      return (
        <span>Loading...</span>
      )
    }

    var bookMargin = 0;
    if (state.contracts.Book)
    {
      if (this.bookLPMarginKey in state.contracts.Book.lpMargin)
      {
        bookMargin = state.contracts.Book.lpMargin[this.bookLPMarginKey].value/1e18
      }
    }

    // If the data is here, get it and display it
    var pendingSpinner = this.props.contracts.SwapMarket.synced ? '' : ' 🔄'
    //const noBook = "0x0000000000000000000000000000000000000000"
    var bookAddr = this.props.contracts.SwapMarket.books[this.bookKey].value
    
    return (
      <div>
        <strong>Book Address: </strong> {bookAddr}{pendingSpinner}
        <br/>
        <span>{this.bookStatus}</span>
        <br/>
        <span>Book Margin: {bookMargin === 0 ? "Waiting for Book" : bookMargin}</span>
        <DisplaySubcontracts subcontracts={bookSubcontracts}/>
        <button className="pure-button" type="button" onClick={this.lookupBook}> Show All Book Info </button>
      </div>
    )
  }
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

    if (takerMarginAmount == 0) {
      return(
        <li key={id.toString()}>
          <p>Subcontract ID: {id}</p>
          <p><strong>Subcontract Terminated</strong></p>
        </li>
      );
    }
    else{
      return(
        <li key={id.toString()}>
          <p>Subcontract ID: {id}</p>
          <p>Required Margin: {rmAmount}</p>
          <p>LP: {props.subcontracts[id].maker}</p>
          <p>Required Margin: {rmAmount}</p>
          <p>Taker Margin: {takerMarginAmount}</p>
          <p>LP Side: {side}</p>
          <p>First Day ID: {props.subcontracts[id].initialDay}</p>
          <p>Status: {status}</p>
        </li>
      );
    }
  });
  return (
    <ul>{listitems}</ul>
  );
}

export default BookData

/*BookData.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    SwapMarket: state.contracts.SwapMarket
  }
}

export default drizzleConnect(BookData, mapStateToProps)*/