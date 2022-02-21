export default function handler(req, res){
    const tokenId = req.query.tokenId; // get tokenId from query parameters
    const image_url = "https://raw.githubusercontent.com/LearnWeb3DAO/NFT-Collection/main/my-app/public/cryptodevs/"; //all images are uploaded to github so i can extract them from there
    res.status(200).json({ //api sends back metadata for nft's, to make it compatible with Opensea it must follow some Metadata standards
        name: "Profit Unity NFT #" + tokenId,
        description: "Profit Unity NFT gives you access to our DAO",
        image: image_url + tokenId + ".svg"
    });
}