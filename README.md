# README

This repository contains a bot implemented that interacts with a CosmWasm-based blockchain.

The bot periodically queries an NFT contract for request IDs, fetches associated data, processes the data using OpenAI's GPT-4 model, and updates the NFT descriptions with the generated responses.

## Features

- **CosmWasm Interaction**: Connects to a CosmWasm blockchain to interact with smart contracts.
- **OpenAI GPT-4 Integration**: Uses OpenAI's GPT-4o mini model to process data and generate responses.
- **Automated NFT Description Updates**: Updates NFT descriptions based on processed data.

---

# How to Run

## Environment Variables

Create a `.env` file in the root directory of your project and populate it with the following variables:

```env
RPC_URL=<your_rpc_url>
CONTRACT_ADDRESS=<your_contract_address>
MNEMONIC=<your_wallet_mnemonic>
OPENAI_API_KEY=<your_openai_api_key>
```

Ensure all environment variables are set correctly before running the bot.

## Running the Bot

To start the bot and the server, use the following command:

```bash
$ node src/bot.js
```

The server will listen on port `3327` by default.

<!-- 
# TODO
- svg
https://docs.opensea.io/docs/metadata-standards
https://opensea.io/assets/ethereum/0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7/5194
https://etherscan.io/address/0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7#readContract
https://www.base64decode.org/ko/
-->
