require("dotenv").config();

const { Secp256k1HdWallet } = require("@cosmjs/amino");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { calculateFee, GasPrice } = require("@cosmjs/stargate");
const axios = require('axios');
const express = require('express');
const cors = require("cors");

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
};

const app = express();
app.use(cors(corsOptions));

// Load and validate environment variables
const rpcUrl = process.env.RPC_URL;
const contractAddress = process.env.CONTRACT_ADDRESS;
const mnemonic = process.env.MNEMONIC;
const apiKey = process.env.OPENAI_API_KEY;

if (!rpcUrl || !contractAddress || !mnemonic || !apiKey) {
    console.error("Missing required environment variables.");
    process.exit(1);
}

// Set gas price and execution fee
const gasPrice = GasPrice.fromString("140000000000aarch");
const executeFee = calculateFee(300_000, gasPrice);

const bot = async () => {
    const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "archway" });
    const [{ address }] = await wallet.getAccounts();
    const client = await SigningCosmWasmClient.connectWithSigner(rpcUrl, wallet);

    // Get prompt
    const prompt = await getPrompt(client);
    console.log(`Prompt: ${prompt.prompt}`);

    while (true) {
        // Get ramaining ids
        let ids;
        try {
            ids = await getIds(client);
            console.log("Monitoring IDs...", ids);
        } catch (error) {
            handleError(error, 'Error during ID monitoring');
        }

        for (let id of ids.ids) {
            try {
                const nftInfo = await getNftInfo(client, id);
                const query = `${prompt.prompt}\n---\n${nftInfo.extension.description} Answer very concisely.`;
                const answer = await callChatGPT(apiKey, query);
                console.log(`Query: ${nftInfo.extension.description}\nAnswer: ${answer}`);

                const execRes = await updateDescription(client, address, id, answer);
                console.log(`Transaction Hash: ${execRes.transactionHash}`);
                const tokenId = execRes.logs[0].events.find(e => e.type === 'wasm').attributes.find(attr => attr.key === 'token_id').value;
                console.log('Token ID:', tokenId);
            } catch (error) {
                handleError(error, 'Error processing ID');
            }
        }

        // Wait for 20 seconds before checking for new requests again
        await new Promise((resolve) => setTimeout(resolve, 20000));
    }
};

const exitIfTimeout = async (promise, timeout) => {
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Timeout')), timeout);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
};

const handleError = (error, message) => {
    console.error(`${message}:`, error);
    process.exit(1);
};

const getPrompt = async (client, timeout = 60000) => {
    try {
        const queryResult = await exitIfTimeout(client.queryContractSmart(contractAddress, { "prompt": {} }), timeout);
        return queryResult ? queryResult : null;
    } catch (error) {
        handleError(error, 'Error fetching prompt');
    }
};

const getIds = async (client, timeout = 60000) => {
    try {
        const queryResult = await exitIfTimeout(client.queryContractSmart(contractAddress, { "request_ids": {} }), timeout);
        return queryResult ? queryResult : null;
    } catch (error) {
        handleError(error, 'Error fetching request IDs');
    }
};

const getNftInfo = async (client, token_id, timeout = 60000) => {
    try {
        const queryResult = await exitIfTimeout(client.queryContractSmart(contractAddress, {
            "nft_info": { "token_id": token_id }
        }), timeout);
        return queryResult ? queryResult : null;
    } catch (error) {
        handleError(error, 'Error fetching NFT info');
    }
};

const callChatGPT = async (apiKey, content, timeout = 10000) => {
    const url = 'https://api.openai.com/v1/chat/completions';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };
    const body = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: content }],
        max_tokens: 150,
    });

    try {
        const response = await exitIfTimeout(axios.post(url, body, { headers }), timeout);
        return response.data.choices[0].message.content;
    } catch (error) {
        handleError(error, 'Error calling ChatGPT');
    }
};

const updateDescription = async (client, senderAddress, token_id, output, timeout = 60000) => {
    const msg = {
        "response": {
            "token_id": token_id,
            "output": output
        }
    };
    try {
        const executeResult = await exitIfTimeout(client.execute(
            senderAddress,
            contractAddress,
            msg,
            executeFee
        ), timeout);
        return executeResult ? executeResult : null;
    } catch (error) {
        handleError(error, 'Error updating description');
    }
};

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down...');
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Call the bot function
bot().catch(error => handleError(error, 'Unhandled error in bot'));

// Start the server
app.listen(3327, () => console.log('Server listening on port 3327...'));
