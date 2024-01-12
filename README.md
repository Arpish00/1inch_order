

NOTE: This repository is created to address and discuss issues related to the script using Limit Order API. It contains three scripts, with the primary focus on the `limit_order` script.

Run the npm install command:

```bash
npm install
```

#### before running:
Before running the scripts, add these values in the `config.json`:

- nodeURL
- privateKey
- walletAddress
- inchDevApiKey


#### Primary Script: `limit_order.js`

To run the primary script, execute:

```bash
npm run limit_order
```

#### Additional Scripts
##### `limit_irder_protocol.js` Script:
This script uses the library @1inch/limit-order-protocol to create limit orders.
```bash
npm run limit_order_protocol
```

##### `limit_order_alpha.js` Script:

This script uses the alpha version (^4.0.21-alpha) of the library @1inch/limit-order-protocol-utils. Make sure to install this version before .
```
npm install @1inch/limit-order-protocol-utils@^4.0.21-alpha
```
```bash
npm run limit_order_alpha
```