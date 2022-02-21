const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const { WHITELIST_CONTRACT_ADDRESS, METADATA_URL } = require("../constants");

async function main(){
    const whitelistContract = WHITELIST_CONTRACT_ADDRESS; //address of my whitelistDapp contract
    const metadataURL = METADATA_URL; //URL from where i'll extract metadata for the nft's 
    const profitUnityContract = await ethers.getContractFactory("ProfitUnity"); //profitUnityContract is a factory for instances of my ProfitUnity contract
    const deployedProfitUnityContract = await profitUnityContract.deploy(metadataURL, whitelistContract); //deploy
    console.log("Profit Unity Contract Address:", deployedProfitUnityContract.address); //print profit unity's address
}

//call the main() function and check if there're any errors 
main() 
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });