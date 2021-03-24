const yargs = require("yargs");

const UniswapTWAPPricer = artifacts.require("UniswapTWAPPricer.sol");

module.exports = async function(callback) {
    try {
        const options = yargs
            .usage("Usage: --network <network> --bot <bot> --asset <asset> --factory <factory> --oracle <oracle> --gas <gasPrice>")
            .option("network", { describe: "Network name", type: "string", demandOption: true })
            .option("bot", { describe: "Bot address", type: "string", demandOption: true })
            .option("asset", { describe: "Asset address", type: "string", demandOption: true })
            .option("oracle", { describe: "Oracle module address", type: "string", demandOption: true })
            .option("gas", { describe: "Gas price in WEI", type: "string", demandOption: false })
            .argv;

        console.log(`Deploying UniswapTWAP pricer contract on ${options.network} 🍕`)

        const tx = await UniswapTWAPPricer.new(options.bot, options.asset, options.factory, options.oracle, {gasPrice: options.gas});

        console.log("UniswapTWAP pricer deployed! 🎉");
        console.log(`Transaction hash: ${tx.transactionHash}`);
        console.log(`Deployed contract address: ${tx.address}`);

        callback();
    }
    catch(err) {
        callback(err);
    }
} 
