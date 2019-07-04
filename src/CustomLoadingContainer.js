import { drizzleConnect } from "drizzle-react";
import React, { Children, Component } from "react";
import PropTypes from "prop-types";
import AssetSwap from '../build/contracts/AssetSwap.json'

/*
 * Create component.
 */

class CustomLoader extends Component {

  constructor(props, context) {
    super(props);
    
  }

  componentDidMount() {
    console.log(this.context)
    const drizz = this.context.drizzle
    var ETHConfig = {
      contractName: 'ETHSwap',
      web3Contract: new drizz.web3.eth.Contract(AssetSwap.abi, '0xa651c4d689eac3a740cb83c090a72a48dd8764bb')
    }
    var SPXConfig = {
      contractName: 'SPXSwap',
      web3Contract: new drizz.web3.eth.Contract(AssetSwap.abi, '0x08f41c5218dca75e7e93f2fa450f26b09a28dd10')
    }
    var BTCConfig = {
      contractName: 'BTCSwap',
      web3Contract: new drizz.web3.eth.Contract(AssetSwap.abi, '0x4283073a6d8cb0f1b8fec504ca1ca925f7c56fe1')
    }
    var BTCETHConfig = {
      contractName: 'BTCETHSwap',
      web3Contract: new drizz.web3.eth.Contract(AssetSwap.abi, '0x0363ebf9b059aa6287b4e287447ec0588ca34a73')
    }
    this.context.drizzle.addContract(ETHConfig)
    this.context.drizzle.addContract(SPXConfig)
    this.context.drizzle.addContract(BTCConfig)
    this.context.drizzle.addContract(BTCETHConfig)
  }

  render() {
    if (this.props.web3.status === "failed") {
      if (this.props.errorComp) {
        return this.props.errorComp;
      }

      return (
        <main className="container loading-screen">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>⚠️</h1>
              <p>
                This browser has no connection to the Ethereum network. Please
                use the Chrome/FireFox extension MetaMask, or dedicated Ethereum
                browsers Mist or Parity.
              </p>
            </div>
          </div>
        </main>
      );
    }

    if (
      this.props.web3.status === "initialized" &&
      Object.keys(this.props.accounts).length === 0
    ) {
      return (
        <main className="container loading-screen">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>🦊</h1>
              <p>
                <strong>{"We can't find any Ethereum accounts!"}</strong> Please
                check and make sure Metamask or your browser are pointed at the
                correct network and your account is unlocked.
              </p>
            </div>
          </div>
        </main>
      );
    }

    if (this.props.drizzleStatus.initialized &&
      Object.keys(this.context.drizzle.contracts).length == 5) {
      return Children.only(this.props.children);
    }

    if (this.props.loadingComp) {
      return this.props.loadingComp;
    }

    return (
      <main className="container loading-screen">
        <div className="pure-g">
          <div className="pure-u-1-1">
            <h1>⚙️</h1>
            <p>Loading dapp...</p>
          </div>
        </div>
      </main>
    );
  }
}

CustomLoader.contextTypes = {
  drizzle: PropTypes.object,
};

CustomLoader.propTypes = {
  children: PropTypes.node,
  accounts: PropTypes.object.isRequired,
  drizzleStatus: PropTypes.object.isRequired,
  web3: PropTypes.object.isRequired,
  loadingComp: PropTypes.node,
  errorComp: PropTypes.node,
};

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    drizzleStatus: state.drizzleStatus,
    web3: state.web3,
  };
};

export default drizzleConnect(CustomLoader, mapStateToProps);