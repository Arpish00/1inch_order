const Web3 = require('web3')
const fetch = require('node-fetch')

const {
    limitOrderProtocolAddresses,
    seriesNonceManagerContractAddresses,
    ChainId,
    Erc20Facade,
    LimitOrderBuilder,
    LimitOrderProtocolFacade,
    LimitOrderPredicateBuilder,
    NonceSeriesV2,  
    SeriesNonceManagerFacade,
    SeriesNonceManagerPredicateBuilder,
    Web3ProviderConnector,
    PrivateKeyProviderConnector
} = require('@1inch/limit-order-protocol-utils');

const config = require('./config.json')

const walletAddress = config.walletAddress;
const inchDevApiKey = config.inchDevApiKey;
const chainId = config.chainId;


const web3 = new Web3(config.nodeURL);

const connector = new PrivateKeyProviderConnector(config.privateKey, web3);
const contractAddress = limitOrderProtocolAddresses[chainId];
const seriesContractAddress = seriesNonceManagerContractAddresses[chainId];

const limitOrderProtocolFacade = new LimitOrderProtocolFacade(contractAddress, chainId, connector);
const seriesNonceManagerFacade = new SeriesNonceManagerFacade(seriesContractAddress, chainId, connector);
const seriesNonceManagerPredicateBuilder = new SeriesNonceManagerPredicateBuilder(seriesNonceManagerFacade);
const limitOrderPredicateBuilder = new LimitOrderPredicateBuilder(limitOrderProtocolFacade);
const erc20Facade = new Erc20Facade(connector);
const limitOrderBuilder = new LimitOrderBuilder(contractAddress, chainId, connector);
const seconds = 60;

const expiration = Math.floor(Date.now() / 1000) + seconds;
const nonce = 0;

const simpleLimitOrderPredicate = limitOrderPredicateBuilder.arbitraryStaticCall(
    seriesNonceManagerPredicateBuilder.facade,
    seriesNonceManagerPredicateBuilder.timestampBelowAndNonceEquals(
        NonceSeriesV2.LimitOrderV3,
        expiration,
        nonce,
        walletAddress,
    ),
);

const limitOrder = limitOrderBuilder.buildLimitOrder({
    makerAssetAddress: config.makerAsset.address,
    takerAssetAddress: config.takerAsset.address,
    makerAddress: walletAddress,
    makingAmount: config.makerAsset.amount,
    takingAmount: config.takerAsset.amount,
    predicate: simpleLimitOrderPredicate,
    // salt: "" + Math.floor(Math.random()*100000000),
});


async function getSignatureAndHash() {
    const limitOrderTypedData = limitOrderBuilder.buildLimitOrderTypedData(limitOrder);
    console.log(limitOrderTypedData);
    const limitOrderSignature = await limitOrderBuilder.buildOrderSignature(walletAddress, limitOrderTypedData);
    
    // const limitOrderSignature = await connector.signTypedData(
    //     walletAddress,
    //     limitOrderTypedData
    // );
    const limitOrderHash = await limitOrderBuilder.buildLimitOrderHash(limitOrderTypedData);
    
    return [limitOrderSignature, limitOrderHash];
}

async function orderPlace() {
    const [limitOrderSignature, limitOrderHash] = await getSignatureAndHash();

    const signature = await limitOrderSignature;
    const data = {
        "orderHash": limitOrderHash,
        "signature": signature,
        "data": limitOrder
    };
    console.log('====> Limit order:')
    console.log(JSON.stringify(data, null, 2));

    try {
        console.log('====> Sending limit order')
        let fetchPromise = await fetch("https://api.1inch.dev/orderbook/v3.0/" + chainId, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "content-type": "application/json",
                "Authorization": "Bearer " + inchDevApiKey,
            },
            "body": JSON.stringify(data),
            "method": "POST"
        });

        console.log(fetchPromise.status);

        if (fetchPromise.status === 400) {
            console.log('====> Error')
            let jsonData = await fetchPromise.json();
            console.log(jsonData);
        } else {
            console.log("Unexpected status code:", fetchPromise.status);
        }
    } catch (e) {
        console.log('====> Error:')
        console.error(e);
    }
}

orderPlace();
