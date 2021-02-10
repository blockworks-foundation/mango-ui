// Hooks and helper functions for handling user's margin accounts are here
import React, { useState, useEffect, useContext } from "react";
// Import function to create margin account from mango library
import { IDS, MangoClient, MangoGroup, MarginAccount } from "@mango/client";
// Connection context
import { useConnection, useConnectionConfig } from '../utils/connection';
// Wallet context
import { useWallet } from '../utils/wallet';
// Type annotations
import { PublicKey } from "@solana/web3.js";
import { MarginAccountContextValues } from "../utils/types";

// Create a context to share account state across pages
const MarginAccountContext = React.createContext<null | MarginAccountContextValues>(null);

// Create the margin account provider
export function MarginAccountProvider({ children }) {
  // Get all state and functions we need for context
  const { marginAccount, marginAccounts, mango_groups, mangoGroup, createMarginAccount, setMarginAccount, maPending } = useMarginAccountHelper();
  // Return a context with this values set as default
  return <MarginAccountContext.Provider
    value={{
      marginAccount,
      marginAccounts,
      mango_groups,
      mangoGroup,
      createMarginAccount,
      setMarginAccount,
      maPending,
    }}
  >
    {children}
  </MarginAccountContext.Provider>
}

// Put some state logic in here in DRY
const useMarginAccountHelper = () => {
  // Save all margin account for a mango group
  const [marginAccounts, setMarginAccounts] = useState<MarginAccount[] | []>([]);
  // Current margin account 
  const [marginAccount, setMarginAccount] = useState<MarginAccount | null>(null);
  // Get the current connection 
  // The current mango group state.
  const [mangoGroup, setMangoGroup] = useState<MangoGroup | null>(null);
  // Save the current mango group identifier
  // TODO: Allow for changing
  const [mango_groups, setMango_Groups] = useState('BTC_ETH_USDC');
  // Let's know when any transaction is pending
  const [maPending, setMAPending] = useState<any>(() => {
    return {
      cma: false, // Is create a margin account taks pending
      sma: false, // Is set a margin account pending
    }
  });
  const connection = useConnection();
  // Now get the current wallet
  const { wallet, connected } = useWallet();
  // Get what endpoint contract is runnig from
  const { endpointInfo } = useConnectionConfig();
  // Get the mango Options (for connection type)
  const [mangoOptions, setmangoOptions] = useState<any>(IDS[endpointInfo!.name]);
  // Now our mango client connection
  // Now our mango client instance
  const [mangoClient] = useState<MangoClient>(new MangoClient())
  /**
   * @summary Create a margin account for a mango group
   */
  const createMarginAccount = async () => {
    // Set pending transactions
    setMAPending(prev => { prev['cma'] = true; return prev });
    // If a margin account already exist, do not create another
    if (marginAccount) {
      // Margin account exists
      setMAPending(prev => { prev['cma'] = false; return prev });
      return;
    }
    if (!mangoGroup) {
      console.error('No mango group selected before creating a margin account');
      setMAPending(prev => { prev['cma'] = false; return prev });
      return;
    }
    // Carry on if we have mango group
    mangoClient.initMarginAccount(connection, new PublicKey(mangoOptions.mango_program_id), new PublicKey(mangoOptions.dex_program_id), mangoGroup, wallet).then(async (marginAccountPK) => {
      // Let's get the margin account object
      let marginAccount = await mangoClient.getMarginAccount(connection, marginAccountPK);
      // Set the margin accounts PK
      setMarginAccount(marginAccount);
      setMAPending(prev => { prev['cma'] = false; return prev });
    })
      .catch(err => { console.error(err); setMAPending(prev => { prev['cma'] = false; return prev }); });
  }

  /**
   * @summary get all margin accounts for a mango group
   */
  const getAllMarginAccountsForGroup = async (): Promise<MarginAccount[] | []> => {
    // Set pending transaction
    setMAPending(prev => { prev['sma'] = true; return prev });;
    if (!mangoGroup) {
      // Did the user not make a selection or maybe our effects have not ran
      console.error('No mango group while getting all margin accounts for a group');
      setMAPending(prev => { prev['sma'] = false; return prev });
      return [];
    }
    // Let's get the public keys for the margin accounts
    let marginAccounts = await mangoClient.getMarginAccountsForOwner(connection, new PublicKey(mangoOptions.mango_program_id), mangoGroup, wallet);
    setMAPending(prev => { prev['sma'] = false; return prev });
    // Return the first account
    return marginAccounts;
  }

  // If we loose connection to wallet, clear the margin account state
  useEffect(() => {
    // Set the default mango group
    if (!mangoGroup && mangoOptions) {
      console.log('No mango group found. Get default')
      // No mango group yet, get the default
      // Did the user make any selection ??
      // Use default mango group of ETH_BTC_USDC
      // Set up default mango group 
      // Get the Mango group. For now we use our default BTC_ETH_USDC
      // TODO: Allow to select a mango group
      let MangoGroup = mangoOptions.mango_groups.BTC_ETH_USDC;
      let mangoGroupPk = new PublicKey(MangoGroup.mango_group_pk);
      mangoClient.getMangoGroup(connection, mangoGroupPk).then((mangoGroup) => {
        // Set the mango group
        // console.log('Gotten mango group ', mangoGroup);
        setMangoGroup(mangoGroup);
      }).catch(err => {
        console.error('Could not get mango group');
      })
    } else {
      // Get the margin account for the selected mango group
      // console.log('Mango group exist ', mangoGroup);
    }
    if (!connected) {
      // We lost connection to wallet, remove the margin accounts
      setMarginAccount(null);
      // Remove the margin accounts pk
      setMarginAccounts([]);
      return;
    }
    if (!marginAccounts || !marginAccount) {
      // No margin account for the user, get them
      console.log('no margin account')
      getAllMarginAccountsForGroup().then((marginAccounts) => {
        // console.log('Gotten margin acount ', marginAccounts)
        // Set the margin accounts
        setMarginAccounts(marginAccounts)
        if (marginAccounts.length > 0) {
          setMarginAccount(marginAccounts[0])
        }
      }).catch(() => {
        console.log('Could not get margin accounts for user in effect');
      })
    }
  }, [connected, connection, mangoOptions, mangoGroup])
  // TODO: Should the mango group change, reset our margin accounts and account
  return { marginAccount, marginAccounts, mangoGroup, mango_groups, createMarginAccount, setMarginAccount, maPending };
}

// Easily pick what margin account context to use
export function useMarginAccount() {
  // Get the margin account context
  const marginAccountContext = useContext(MarginAccountContext);
  if (!marginAccountContext) {
    // Context does not exist
    throw new Error('Missing margin account context');
  }
  // Build a mapping of pubkeys to marginaccounts
  const buildPubKeytoAcountMapping = (): Map<PublicKey, MarginAccount> => {
    let mapping = new Map();
    marginAccountContext.marginAccounts.forEach(account => {
      mapping.set(account.publicKey.toBase58(), account);
    });
    return mapping;
  }

  return {
    marginAccount: marginAccountContext.marginAccount,
    marginAccounts: marginAccountContext.marginAccounts,
    mango_groups: marginAccountContext.mango_groups,
    mangoGroup: marginAccountContext.mangoGroup,
    createMarginAccount: marginAccountContext.createMarginAccount,
    setMarginAccount: marginAccountContext.setMarginAccount,
    maPending: marginAccountContext.maPending,
    keyMappings: buildPubKeytoAcountMapping,
  }
}