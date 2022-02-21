import { Contract, providers, utils } from "ethers";
import { getJsonWalletAddress } from "ethers/lib/utils";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home(){
  const [walletConnected, setWalletConnected] = useState(false); //walletConnected keeps track of whether wallet is connected or not and setWalletConnected let's me change the state.
  const [presaleStarted, setPresaleStarted] = useState(false); //keeps track of whether presale has started or not
  const [presaleEnded, setPresaleEnded] = useState(false); //keeps track of whether presale has ended or not
  const [loading, setLoading] = useState(false); //loading = true when we're waiting for a tx to get mined
  const [isOwner, setIsOwner] = useState(false); // check if connected wallet = owner of contract
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0"); // keeps track of amount of minted nft's
  const web3ModalRef = useRef(); //reference to the web3modal which connects the user to metamask, to persist as long as the page is open
  
  //function to mint 1 nft during the presale
  const presaleMint = async () => {
    try {
      const signer = await getProviderOrSigner(true); //need a signer becuase minting is a 'write' tx
      const whitelistContract = new Contract( //new instance of the contract, with a signer, which allows update methods
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const tx = await whitelistContract.presaleMint({ //call presaleMint() from contract, only WL can mint
        value: utils.parseEther("0.01"), // value = price of 1 nft, 0.01 eth. Parsing '0.01' string to ether using utils library from ethers.js
      });
      setLoading(true); //we're waiting for the tx to get mined
      await tx.wait(); // waiting for tx to get mined
      setLoading(false); // tx has been mined
      window.alert("You succesfully minted a Profit Unity NFT!"); // let user know mint succeeded
    } catch (err) {
      console.error(err);
    }
  };

  //function to mint 1 nft after presale
  const publicMint = async () => {
    try {
      const signer = await getProviderOrSigner(true); // need signer bc mint is write tx
      const whitelistContract = new Contract( //new instance of the contract, with a signer, which allows update methods
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const tx = await whitelistContract.mint({
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("You succesfully minted a Profit Unity NFT!");
    } catch (err) {
      console.error(err);
    }
  };

  //function to connect to metamask
  const connectWallet = async () => {
    try {
      await getProviderOrSigner(); // get provider from web3Modal, metamask in this case. When used for first time, user'll be asked to connect their wallet.
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // function to start the presale
  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true); // write tx so need signer
      const whitelistContract = new Contract( //new instance with signer
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const tx = await whitelistContract.startPresale(); // call startPresale() from contract
      setLoading(true); // wait for tx to get mined
      await tx.wait(); // wait
      setLoading(false); // tx mined  
      await checkIfPresaleStarted(); // set presale started to true
    } catch (err) {
      console.error(err);
    }
  };

  // function that checks if presale has started by querying 'presaleStarted' variable in contract
  const checkIfPresaleStarted = async () => {
    try {
      const provider = await getProviderOrSigner(); // get provider from web3modal, read only so provider is enough
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider); // new instance with read only access, connected to profitunity.sol contract
      const _presaleStarted = await nftContract.presaleStarted(); // get 'presaleStarted' variable from contract
      if (!_presaleStarted) { 
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // function that checks if presale has ended by querying 'presaleEnded' variable in contract
  const checkIfPresaleEnded = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _presaleEnded = await nftContract.presaleEnded();
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000)); //_presaleEnded is a big number so we use lt(less than) instead of <. If it is smaller than current time, the presale has ended.
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }
      return hasEnded; // not sure why we do this? 
    } catch (err) {
      console.error(err);
      return false; //not sure what this does?
    }
  };

  // function that gets the owner from contract
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _owner = await nftContract.owner(); // call owner function from contract
      const signer = await getProviderOrSigner(true); // get signer so that we can compare signer address to owner address
      const address = await signer.getAddress(); // get signer's address
      if (address.toLowerCase() === _owner.toLowerCase()){
        setIsOwner(true); 
      } 
    } catch (err) {
      console.error(err.message); // not sure why it's err.message here?
    }
  };

  // function that gets number of minted tokenIds
  const getTokenIdsMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _tokenIds = await nftContract.tokenIds(); //call tokenIds from contract
      setTokenIdsMinted(_tokenIds.toString()); // set amount of minted and convert to string
    } catch (err) {
      console.error(err);
    }
  };  

  // function that we've been using to get signer or provider, if needSigner = false, it'll return a provider, if true a signer. 
  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect(); // connect to metamask
    const web3Provider = new providers.Web3Provider(provider); // access current value of web3modal, bc it is a reference, to get underlying object

    const { chainId } = await web3Provider.getNetwork(); // if not connected to correct network, let user know and throw error
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change the network to Rinkeby");
    }

    if (needSigner) { //logic to get a signer, if needSigner = true
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  useEffect(() => { //reacts to changes in state of website. array at end represents what changes will trigger it. whenever 'walletConected' changes, effect triggers.
    if (!walletConnected) { //create new instance of Web3Modal if wallet isnt connected
      web3ModalRef.current = new Web3Modal({ // assign Web3Modal class to reference object by setting current value. this value is persisted as long as the page is open.
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      const _presaleStarted = checkIfPresaleStarted(); // check if presale has started
      if (_presaleStarted) { // if presale has started, check if it has already ended
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // interval which gets called every 5 seconds to check if the presale has ended
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted(); // check if presale has started, boolean
        if (_presaleStarted) { // if true, if false, it checks again in 5 seconds
          const _presaleEnded = await checkIfPresaleEnded(); // check if presale has ended
          if (_presaleEnded) { // if true, clear the interval, if false
            clearInterval(presaleEndedInterval)
          } 
        }
      }, 5 * 1000); // check every 5 seconds. If _presaleEnded = true, the interval stops. 

      // interval that checks number of tokenIds minted every 5 seconds
      setInterval(async function(){
        await getTokenIdsMinted();
      }, 5 * 1000)
    }
  }, [walletConnected]); // everytime the value of walletConnected changes, the effect triggers. 

  //function that renders a button based on the stat of the dapp
  const renderButton = () => {
    if (!walletConnected) { // if wallet is not connected, ! = true, so it will return a button that allows them to connect their wallet
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }
  
    if (loading) { // if loading = true, return a button that displays loading
      return <button className={styles.button}>Loading...</button>; 
    }

    if (isOwner && !presaleStarted) { // if connected user = the owner & presale hasnt started yet, show button that allows user to start it
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    if (!presaleStarted) { // user isnt the owner and presale hasnt started, tell them
      return (
        <div>
          <div className={styles.description}>Presale hasnt started yet.</div>
        </div>
      );
    }

    if (presaleStarted && !presaleEnded) { // presale is live, WL can mint
      return (
        <div>
          <div className={styles.description}>
            Presale has started! If your address is whitelisted you can mint a Profit Unity NFT.
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint
          </button>
        </div>
      );
    }

    if (presaleStarted && presaleEnded){ // presale has started and ended, now it's time for public mint
      return (
        <div>
          <div className={styles.description}>
            Presale has ended! Public mint is live.
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Public Mint
          </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Profit Unity NFT</title>
        <meta name="description" content="Whitelist-Dapp"/>
        <link rel="icon" href="/favicon.ico"/>
      </Head>
      <div className={styles.main}>
        <div>
        <h1 className={styles.title}>Welcome to Profit Unity NFT!</h1>
        <div className={styles.description}>
          Holding a Profit Unity NFT gives you access to our fantastic DAO.
        </div>
        <div className={styles.description}>
          {tokenIdsMinted}/20 have been minted
        </div>
        {renderButton()}
      </div>
      <div>
        <img className={styles.image} src="./cryptodevs/0.svg"/>
      </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Zizou (beloved Profit Unity member)
      </footer>
    </div>
  );
}




 