CLI javascript script for checking solana SPL token's current PNL.

The following script:
 - Allows you to use a custom RPC for increased performance.
 - Allows you to customise the amount of solana transactions to check.
 - Allows you to customise the amount of simultaneous batches to be ran at once.
 - Checks to see if the token account exists to get SPL token, but will fall back to the wallet address if the token account has been closed.
 - Allows you to check the amount of Solana spent on the SPL token.
 - Allows you to check the amount of Solana earned from the SPL token.
 - Allows you to check the amount of Solana profited from the SPL token.
 - Allows you to check the amount of the SPL tokens purchased.
 - Allows you to check the amount of the SPL tokens sold.
 - Allows you to check the amount of the SPL tokens still held.

Example CLI usage: `node index.js`

(Pushed change to use SOL instead of WSOL).