# SmartSwap

This project contains everything you need to run the SmartSwap front end locally.

## Installation - ETH Blockchain

Node.js is required to run the server.

## Installation - Test Blockchain

Node.js is required to run the server.

1. Install Truffle and Ganache CLI. Alternately, download the graphical version of Ganache.
    ```
    npm install -g truffle@4.1.15;
    npm install -g ganache-cli
    ```

2. Start the development blockchain. Optionally, set the time to produce blocks.
    ```javascript
    // 1 second blocktime.
    ganache-cli -b 1
    ```

3. Compile the contracts
    ```javascript
    truffle compile
    ```

4. Migrate the contracts to the ganche blockchain
    ```javascript
    truffle migrate
    ```

5. Run the server
    ```javascript
    npm run start
    ```
6. Verfify the front end is running at http://localhost:3000 in browser

## Testing the Contract

Start the ganache-cli test chain

    `ganache-cli -b 1 -a 200 -e 1000`

In a separate window, run the tests

    `truffle test test/testswap.js`

## Deploying to the live network

    `truffle migrate --network live`