pragma solidity ^0.4.24;

import "./AssetSwap.sol";

contract ManagedAccount {

    address public manager;
    address public investor;
    mapping(address => bool) approvedSwaps;

    event AddedFunds(uint amount);
    
    modifier onlyInvestor()
    {
        require(msg.sender == investor);
        _;
    }

    modifier onlyApproved()
    {
        require(msg.sender == manager || msg.sender == investor);
        _;
    }
    
    constructor(address _manager, address _investor) public
    {
        manager = _manager;
        investor = _investor;
    }

    /*** assetswap functions ***/
    function createBook(address swap, uint min)
        public
        onlyApproved
    {
        require(approvedSwaps[swap]);
        AssetSwap s = AssetSwap(swap);

        s.createBook(min);
    }

    function increaseOpenBalance(address swap, uint value)
        public
        onlyApproved
    {
        AssetSwap s = AssetSwap(swap);

        s.increaseOpenBalance.value(value)();
    }

    function reduceOpenBalance(address swap, uint amount)
        public
        onlyApproved
    {
        AssetSwap s = AssetSwap(swap);

        s.reduceOpenBalance(amount);
    }

    function fundBookMargin(address swap)
        public
        payable
        onlyApproved
    {
        AssetSwap s = AssetSwap(swap);
        s.lpFund.value(msg.value)(address(this));
    }

    function withdrawBookMargin(address swap, uint amount)
        public
        payable
        onlyApproved
    {
        AssetSwap s = AssetSwap(swap);
        s.lpMarginWithdrawal(amount);
    }

    function withdrawFromSwap(address swap)
        public
        onlyApproved
    {
        AssetSwap s = AssetSwap(swap);
        s.withdrawBalance();
    }

    function cancel(address swap, bytes32 id)
        public
        onlyApproved
    {
        AssetSwap s = AssetSwap(swap);
        s.playerCancel(address(this), id);
    }

    function redeem(address swap, bytes32 id)
        public
        onlyApproved
    {
        AssetSwap s = AssetSwap(swap);
        s.redeem(address(this), id);
    }


    /*** management functions ***/
    function addAsset(address swap)
        public
        onlyInvestor
    {
        approvedSwaps[swap] = true;
    }


    function changeManager(address newManager) 
        public
        onlyInvestor
    {
        manager = newManager;
    }

    function fund()
        public
        payable
        onlyInvestor
    {
        emit AddedFunds(msg.value);
    }

    function investorWithdraw()
        public
        onlyInvestor
    {
        investor.transfer(address(this).balance);
    }
}