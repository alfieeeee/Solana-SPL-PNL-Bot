const holderAddress = "DSL56opnnHii1RyGHg8Fcb1abPzDyTvkphrRXJNam33t"
const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
const txPages = 1
const batchCount = 50

const rpc = "https://newest-quiet-dawn.solana-mainnet.quiknode.pro/3c56a83d359e898ebc6bbdae0ba05fc17536c2ce"

async function getTokenAccount(holderAddress, tokenAddress) {
    const tokenAccountResponse = await fetch(rpc, {
        method: "POST",
        body: JSON.stringify({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTokenAccountsByOwner",
            "params": [
                holderAddress,
                {
                    "mint": tokenAddress
                },
                {
                    "encoding": "jsonParsed"
                }
            ]
            })
    })
    const tokenAccountData = await tokenAccountResponse.json()
    if (tokenAccountData.result.value[0]) {
        console.log(tokenAccountData.result.value[0].pubkey)
        return tokenAccountData.result.value[0].pubkey
    } else {
        return null
    }
}

async function getTransactions(holderAddress, txPages) {
    let txArray = []
    let txLast = ""
    for (let i = 0; i < txPages; i++) {
        if (i === 0) {
            const holderTxResponse = await fetch(rpc, {
                method: "POST",
                body: JSON.stringify({ 
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getSignaturesForAddress",
                    "params": [
                        holderAddress,
                        {
                            "commitment" : "finalized",
                            "limit": 1000,
                        }
                    ]
                  })
            })
            const holderTxData = await holderTxResponse.json()
            txLast = holderTxData.result.slice(-1)[0].signature
            for (let j = 0; j < holderTxData.result.length; j++) {
                txArray.push(holderTxData.result[j].signature)
            }
        } else {
            const holderTxResponse = await fetch(rpc, {
                method: "POST",
                body: JSON.stringify({ 
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getSignaturesForAddress",
                    "params": [
                        holderAddress,
                        {
                            "commitment" : "finalized",
                            "limit": 1000,
                            "before": txLast
                        }
                    ]
                  })
            })
            const holderTxData = await holderTxResponse.json()
            txLast = holderTxData.result.slice(-1)[0].signature
            for (let j = 0; j < holderTxData.result.length; j++) {
                txArray.push(holderTxData.result[j].signature)
            }
        }
    }
    return txArray
}

async function getTransactionDetails(transactions, batchCount) {
    const batches = []
    const promises = []

    console.log(transactions.length)

    let realBatchCount = batchCount
    if (transactions.length < batchCount) {
        realBatchCount =transactions.length
    }

    for (let i = 0; i < transactions.length; i += (transactions.length / realBatchCount)) {
        batches.push(transactions.slice(i, i + transactions.length / realBatchCount))
    }

    for (const batch of batches) {
        const promise = fetch(rpc, {
            method: "POST",
            body: JSON.stringify(batch.map(tx => ({
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTransaction",
                "params": [
                    tx, 
                    {
                        "encoding": "jsonParsed",
                        "maxSupportedTransactionVersion": 0
                    }
                ]
            })))
        }).then(response => response.json())
        promises.push(promise)
    }

    const results = await Promise.all(promises)
    const transactionDetailsData = results.flat()

    return transactionDetailsData
}

async function getFilteredTransactions(transactionDetails, tokenAddress) {
    let filteredArray = []
    for (let i = 0; i < transactionDetails.length; i++) {
        if (transactionDetails[i].result) {
            const exists = transactionDetails[i].result.meta.postTokenBalances.some(balance => balance.mint === tokenAddress)
            if (exists) {
                filteredArray.push(transactionDetails[i])
            }
        }
    }
    return filteredArray
}

async function getTokenTrades(filteredTransactions, tokenAddress, holderAddress) {
    const trades = []
    let transactions = filteredTransactions.reverse()
    for (let i = 0; i < transactions.length; i++) { 

        let solAddress = "So11111111111111111111111111111111111111112"

        let preBalances = transactions[i].result.meta.preTokenBalances
        let postBalances = transactions[i].result.meta.postTokenBalances

        let preTokenAmount = 0
        let preSolAmount = 0
        for (const preBalance of preBalances) {
            if (preBalance.mint === tokenAddress && preBalance.owner === holderAddress) {
                preTokenAmount += preBalance.uiTokenAmount.uiAmount
            }
            if (preBalance.mint === solAddress) {
                preSolAmount += preBalance.uiTokenAmount.uiAmount
            }
        }

        let postTokenAmount = 0
        let postSolAmount = 0
        for (const postBalance of postBalances) {
            if (postBalance.mint === tokenAddress && postBalance.owner === holderAddress) {
                postTokenAmount += postBalance.uiTokenAmount.uiAmount
            }
            if (postBalance.mint === solAddress) {
                postSolAmount += postBalance.uiTokenAmount.uiAmount
            }
        }

        let diffTokenAmount = postTokenAmount - preTokenAmount
        let diffSolAmount = preSolAmount - postSolAmount
        let type = ""
        if (diffSolAmount > 0) {
            type = "sold"
        } else {
            type = "bought"
        }

        let object = {
            tokenDifference: diffTokenAmount,
            solDifference: diffSolAmount,
            type: type
        }

        trades.push(object)
    }
    return trades
}

async function getTokenPnl(tokenTrades) {
    let solSpent = 0
    let solEarned = 0
    let solProfit = 0
    let tokensBought = 0
    let tokensSold = 0
    let tokensStillHeld = 0
    for (const trade of tokenTrades) { 
        if (trade.type === "bought") {
            solSpent = solSpent + Math.abs(trade.solDifference)
            tokensBought = tokensBought + trade.tokenDifference
        }
        if (trade.type === "sold") {
            solEarned = solEarned + trade.solDifference
            tokensSold = tokensSold + Math.abs(trade.tokenDifference)
        }
    }
    solProfit = solEarned - solSpent
    tokensStillHeld = tokensBought - tokensSold

    let object = {
        holder: holderAddress,
        token: tokenAddress,
        solSpent: solSpent,
        solEarned: solEarned,
        solProfit: solProfit,
        tokensBought: tokensBought,
        tokensSold: tokensSold,
        tokensStillHeld: tokensStillHeld
    }
    return object
}

async function main(holderAddress, tokenAddress, txPages, batchCount) {
    console.time("Pnl Time Taken")

    const tokenAccount = await getTokenAccount(holderAddress, tokenAddress)

    let transactions = []
    if (tokenAccount !== null) {
        console.log("token account")
        transactions = await getTransactions(tokenAccount, txPages)
    } else {
        console.log("wallet address")
        transactions = await getTransactions(holderAddress, txPages)
    }
    //console.log(transactions)

    const transactionDetails = await getTransactionDetails(transactions, batchCount)
    //console.log(transactionDetails)

    const filteredTransactions = await getFilteredTransactions(transactionDetails, tokenAddress)
    //console.log(filteredTransactions)

    const tokenTrades = await getTokenTrades(filteredTransactions, tokenAddress, holderAddress)
    //console.log(tokenTrades)

    const tokenPnl = await getTokenPnl(tokenTrades, tokenAddress, holderAddress)
    console.log(tokenPnl)

    console.timeEnd("Pnl Time Taken")
}

main(holderAddress, tokenAddress, txPages, batchCount)