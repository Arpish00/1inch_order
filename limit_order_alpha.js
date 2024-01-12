// IMPORTANT: Only run this script with version 4.0.21-alpha of @1inch/limit-order-protocol-utils
//   "@1inch/limit-order-protocol-utils": "^4.0.21-alpha"

const fetch = require('node-fetch');
const Web3 = require('web3');
const {
    limitOrderProtocolAddresses,
    seriesNonceManagerContractAddresses,
    ChainId,
    Erc20Facade,
    LimitOrderV3Builder,
    LimitOrderProtocolV3Facade,
    LimitOrderPredicateV3Builder,
    SeriesNonceManagerFacade,
    SeriesNonceManagerPredicateBuilder,
    Web3ProviderConnector,
    PrivateKeyProviderConnector,
    NonceSeriesV2,
    LimitOrderBuilder,
} = require('@1inch/limit-order-protocol-utils');
const config = require('./config.json')

const walletAddress = config.walletAddress;
const inchDevApiKey = config.inchDevApiKey;
const chainId = config.chainId;


const web3 = new Web3(config.nodeURL);
const connector = new PrivateKeyProviderConnector(config.privateKey, web3);

const contractAddress = limitOrderProtocolAddresses[chainId];
const seriesContractAddress = seriesNonceManagerContractAddresses[chainId];
const seconds = 60;

console.log(contractAddress);

const limitOrderProtocolFacade = new LimitOrderProtocolV3Facade(contractAddress, chainId, connector);
const seriesNonceManagerFacade = new SeriesNonceManagerFacade(seriesContractAddress, chainId, connector);
const seriesNonceManagerPredicateBuilder = new SeriesNonceManagerPredicateBuilder(seriesNonceManagerFacade);
const limitOrderPredicateBuilder = new LimitOrderPredicateV3Builder(limitOrderProtocolFacade);
const erc20Facade = new Erc20Facade(connector);
const eip712Params = {
    domainName: '1inch Aggregation Router',
    version: '5'
};
const Salt = "" + Math.floor(Math.random() * 100000000);

const limitOrderBuilder = new LimitOrderV3Builder(connector, eip712Params);

async function getSignatureAndHash() {
    const expiration = Math.floor(Date.now() / 1000) + seconds;
    const nonce = await seriesNonceManagerFacade.getNonce(NonceSeriesV2.LimitOrderV3, walletAddress);
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
        salt: Salt,
    });

    const { order } = limitOrder;

    console.log(limitOrder);
    const limitOrderTypedData = await limitOrderBuilder.buildLimitOrderTypedData(limitOrder, chainId, contractAddress);
    console.log("Limit Order typed data:", limitOrderTypedData);
    console.log("Limit Order type data complete");

    const limitOrderSignature = await limitOrderBuilder.buildOrderSignature(walletAddress, limitOrderTypedData);
    console.log("Limit Order Signature:", limitOrderSignature);

    const limitOrderHash = await limitOrderBuilder.buildLimitOrderHash(limitOrderTypedData);
    console.log("Limit Order Hash:", limitOrderHash);

    return [limitOrderSignature, limitOrderHash, limitOrder];
}

async function orderPlace() {
    const [limitOrderSignature, limitOrderHash, limitOrder] = await getSignatureAndHash();
    const signature = await limitOrderSignature;

    console.log("calldata returned!");
    const callData = {
        "orderHash": limitOrderHash,
        "signature": signature,
        "data": limitOrder
    };

    console.log(callData);
    console.log("calldata before sending", JSON.stringify(callData, null, 2));

    try {
        console.log('====> Sending limit order')
        const response = await fetch(`https://api.1inch.dev/orderbook/v3.0/${chainId}`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${inchDevApiKey}`,
            },
            body: JSON.stringify(callData),
        });

        const jsonData = await response.json();
        console.log('====> Response:')
        console.log(jsonData);
    } catch (e) {
        console.error(e);
    }
}

orderPlace();
