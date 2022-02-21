// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IWhitelist.sol";

contract ProfitUnity is ERC721Enumerable, Ownable {
    string _baseTokenURI; //URI will be concatenation of baseURI and tokenID
    uint256 public _price = 0.01 ether; //price of 1 nft
    bool public _paused; //to pause the contract in case of an emergency
    uint256 public maxTokenIds = 20; //maximum supply 
    uint256 public tokenIds; //amount of tokenIDs minted
    IWhitelist whitelist; //whitelist contract instance to check if an address is whitelisted
    bool public presaleStarted; // boolean that keeps track of when presale started
    uint256 public presaleEnded; //timestamp that indicates end of the presale
    modifier onlyWhenNotPaused {
        require(!_paused, "Contract currently paused");
        _;
    } //modifier that will first perform the check and then the function because of the "_". Come back later to add what its usecase is.

    //ERC721 constructor wants a name and symbol for the collection. Profit Unity constructor wants a baseURI to set _baseTokenURI for the collection and initializes an instance of whitelist interface.
    constructor (string memory baseURI, address whitelistContract) ERC721("Profit Unity", "PU"){
        _baseTokenURI = baseURI;
        whitelist = IWhitelist(whitelistContract);
    }

    //@dev function that starts the presale. Can only be called by the owner. Sets presaleStarted to true and sets time for when the presale'll end.
    function startPresale() public onlyOwner {
        presaleStarted = true;
        presaleEnded = block.timestamp + 5 minutes; //in this case the presale will end 5 minutes after the current time. Block.timestamp = now, + amount and solidity has syntax for seconds, minutes, hours, days, years.
    }

    //@dev function that allows whitelisted wallets to mint 1 nft. Payable because my contract will receive Eth. Modifier applied to this function so it can only be called when contract isnt paused. 
    function presaleMint() public payable onlyWhenNotPaused{
        require(presaleStarted && block.timestamp < presaleEnded, "Presale is not running"); //presaleStarted must be true and current time must be less than max presale time.
        require(whitelist.whitelistAddresses(msg.sender), "You are not whitelisted"); //user must be whitelisted, call function that checks from instance.
        require(tokenIds < maxTokenIds, "Maximum supply exceeded"); //cant exceed max supply
        require(msg.value >= _price, "Eth amount sent is not correct"); //msg.value is amount they sent, should be equal to our set price
        tokenIds += 1; //increase tokenIds by 1
        _safeMint(msg.sender, tokenIds); //_safeMint is a safer version of _mint. It ensures that if the address being minted to is a contract, it knows how to deal with ERC721 tokens. If address being minted to isnt a contract it'll work like _mint.
    }

    //@dev function that allows anyone to mint 1 nft, after the presale has ended. 
    function mint() public payable onlyWhenNotPaused{
        require(presaleStarted && block.timestamp >= presaleEnded, "Presale hasnt ended yet");//presale must have ended already, so current time must be greater than presale's end time.
        require(tokenIds < maxTokenIds, "Maximum supply exceeded");
        require(msg.value >= _price, "Eth amount sent is not correct");
        tokenIds += 1;
        _safeMint(msg.sender, tokenIds);
    }

    function _baseURI() internal view virtual override returns (string memory){
        return _baseTokenURI; //@dev function which overrides Openzeppelin's ERC721 implementation. That would by default return an empty string for baseURI.
    }

    function setPaused(bool val) public onlyOwner{
        _paused = val; //function to pause or unpause the contract. 
    }

    //@dev function that allows owner to send all the Eth in the contract to his addy
    function withdraw() public onlyOwner{
        address _owner = owner(); //get owner's address
        uint256 amount = address(this).balance; //get amount of Eth in contract
        (bool sent, ) = _owner.call{value: amount}(""); // not sure
        require(sent, "Failed to send Eth"); //sent must be true
    }

    receive() external payable {} // receive eth if msg.data() is empty, external because function is meant to be called by outside contracts
    fallback() external payable {} //receive eth if msg.data isnt empty
}
