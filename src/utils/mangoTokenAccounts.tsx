// Here we keep track of the token accounts for the current mango group
import { useWallet } from './wallet';
import { useEffect, useReducer, useRef, useState } from 'react';
// Import function to create margin account from mango library
import { mangoTokenAccounts, TokenAccount } from '../utils/types';
import { useMarginAccount } from './marginAccounts';
import { useTokenAccounts } from './markets';
// Get token account balane
import { parseTokenAccountData } from './tokens';
// Hook to keep track of the token accounts for the selected mango group
export const useMangoTokenAccount = () => {
  // Get our mango group context
  const { mangoGroup, mango_groups } = useMarginAccount();
  // Get the cached token accounts
  const tokenAccounts = useTokenAccounts();
  // The token account for all mango group is stored in this state variable
  // TODO: Allow for dynamic groups
  const [mangoGroupTokenAccounts, dispatch] = useReducer(mangoTokenAccReducer, {});
  // For creating a mapping from token account key to token account
  const tokenAccountsMapping = useRef({});
  // Wallet connection
  const { connected } = useWallet();
  /*
    Note care should be taken using this hook since it causes a state update at every tokenAccounts change (about 6 seconds)
  */
  // This function gets all token accounts for the current mango group
  // TODO: Perform some deep comparison to prevent state update
  const getTokenAccounts = () => {
    if (mangoGroup && tokenAccounts[0]) {
      // Get the tokens for this mango group
      let tokens = mangoGroup.tokens;
      // Filter token accounts to find accounts with th same mint address as the tokens mint address
      // Note: This logic works because the array arrangement of tokens and mango_groups match
      let Accounts: mangoTokenAccounts | [] = [];
      mango_groups.forEach((token, i) => {
        // Get the mint address of this token
        let mintAddress = tokens[i].toBase58();
        // Get all accounts with the effective mint address
        let accounts: TokenAccount[] | [] = tokenAccounts[0]
          ? tokenAccounts[0].filter((account) => account.effectiveMint.toBase58() === mintAddress)
          : [];
        // Set the token accounts for this token
        Accounts[token] = accounts;
        // Add to the ref of token account to their publick key mapping
        accounts.forEach((account) => {
          if (account && account.account) {
            // How much does this token account have
            let balance = (
              parseTokenAccountData(account.account.data).amount /
              Math.pow(10, mangoGroup?.mintDecimals[i])
            ).toFixed(3);
            tokenAccountsMapping.current[account.pubkey.toString()] = { account, balance };
          }
        });
      });
      // Set the accounts
      dispatch({ type: 'Update', payload: Accounts });
    }
    return;
  };

  useEffect(() => {
    if (!mango_groups || !mangoGroup || !tokenAccounts[0]) {
      // Bail out of state update
      return;
    }
    getTokenAccounts();
  }, [mangoGroup, mango_groups, tokenAccounts[0]]);

  // Clear token accounts when wallet is disconnected
  useEffect(() => {
    if (!connected) {
      dispatch({ type: 'Reset' });
      tokenAccountsMapping.current = {};
    }
  }, [connected]);

  // Export some needed state
  return { mangoGroupTokenAccounts, tokenAccountsMapping };
};

// Reducer function for the state update
function mangoTokenAccReducer(state: mangoTokenAccounts, action: any) {
  switch (action.type) {
    case 'Update':
      return { ...state, ...action.payload };
    case 'Reset':
      return {};

    default:
      return { ...state };
  }
}
