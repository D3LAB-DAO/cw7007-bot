require("dotenv").config();

const { Secp256k1HdWallet } = require("@cosmjs/amino");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { calculateFee, GasPrice } = require("@cosmjs/stargate");

const express = require('express');
const cors = require("cors");
const corsOptions = {
    origin: '*',
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200,
}

const app = express();
app.use(cors(corsOptions))

// Load environment variables
const rpcUrl = process.env.RPC_URL;
const contractAddress = process.env.CONTRACT_ADDRESS;
const mnemonic = process.env.MNEMONIC;

const gasPrice = GasPrice.fromString("140000000000aconst");
const executeFee = calculateFee(300_000, gasPrice);


async function bot() {
    const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "archway" });
    const [{ address, pubkey }] = await wallet.getAccounts();
    const senderAddress = address;

    const client = await SigningCosmWasmClient.connectWithSigner(rpcUrl, wallet);

    // Get prompt
    const prompt = await getPrompt(client);
    console.log(`prompt: ${prompt.prompt}`);

    while (true) {
        // Get ramaining ids
        const ids = await getIds(client);
        console.log("Monitor...", ids);

        for (let j = 0; j < ids.ids.length; j++) {
            const id = ids.ids[j];
            try {
                // Update description
                const execRes = await updateDescription(client, senderAddress, id, "World"); // TODO
                console.log(`tx: ${execRes.transactionHash}`);
            } catch (error) {
                console.error(error);
            }
        }

        // Wait for 5 seconds before checking for new requests again
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
}

async function getPrompt(client) {
    const queryResult = await client.queryContractSmart(contractAddress, {
        "prompt": {},
    });
    return queryResult ? queryResult : null;
}

async function getIds(client) {
    const queryResult = await client.queryContractSmart(contractAddress, {
        "request_ids": {},
    });
    return queryResult ? queryResult : null;
}

async function updateDescription(client, senderAddress, token_id, output) {
    const msg = {
        "response": {
            "token_id": token_id,
            "output": output
        }
    };
    const executeResult = await client.execute(
        senderAddress,
        contractAddress,
        msg,
        executeFee
    );
    return executeResult ? executeResult : null;
}

// Call the bot function
bot().catch(console.error);

// Start the server
app.listen(3327, () => console.log('Server listening on port 3327...'));
