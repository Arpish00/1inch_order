const { 
    PrivateKeyProviderConnector,
    LimitOrderBuilder,
    Web3ProviderConnector,
    LimitOrderProtocolFacade,
    LimitOrderPredicateBuilder, 
} = require('@1inch/limit-order-protocol')

const Web3 = require('web3')
const axios = require('axios')

const config = require('./config.json')

const web3Provider = new Web3(config.nodeURL)

const privateKeyProviderConnector = new PrivateKeyProviderConnector(
    config.privateKey,
    web3Provider
)

const limitOrderBuilder = new LimitOrderBuilder(
    config.contractAddress,
    config.chainId,
    privateKeyProviderConnector
)

const limitOrderProtocolFacade = new LimitOrderProtocolFacade(
    config.contractAddress,
    privateKeyProviderConnector
)

const limitOrderPredicateBuilder = new LimitOrderPredicateBuilder(
    limitOrderProtocolFacade
)

const {
    and,
    timestampBelow,
} = limitOrderPredicateBuilder

const createLimitOrder = async () => {
    const limitOrderParams = {
        makerAssetAddress: config.makerAsset.address,
        takerAssetAddress: config.takerAsset.address,
        makerAddress: config.walletAddress,
        makerAmount: config.makerAsset.amount,
        takerAmount: config.takerAsset.amount,
        predicate: and(
            timestampBelow(Math.round(Date.now() / 1000) + 60)
        ),
    }
    console.log('====> Building limit order with params:')
    console.log(limitOrderParams)
    const limitOrder = limitOrderBuilder.buildLimitOrder(limitOrderParams)
    const limitOrderTypedData = limitOrderBuilder.buildLimitOrderTypedData(
        limitOrder
    )
    console.log('====> Limit order typed data:')
    console.log(limitOrderTypedData)
    const limitOrderSignature = await privateKeyProviderConnector.signTypedData(
        config.walletAddress,
        limitOrderTypedData
    )
    const limitOrderHash = limitOrderBuilder.buildLimitOrderHash(
        limitOrderTypedData
    )

    return {
        "orderHash": limitOrderHash,
        "signature": limitOrderSignature,
        "data": limitOrder
    }
}

createLimitOrder().then(limitOrder => {
    console.log('====> Sending limit order:')
    console.log(limitOrder)
    axios.post(`https://limit-orders.1inch.io/v3.0/${config.chainId}/limit-order`, limitOrder)
    .then(res => {
        console.log('====> Response:')
        console.log(res)
    }).catch(err => {
        console.log('====> Error:')
        console.log(err.response.data)
    })
})