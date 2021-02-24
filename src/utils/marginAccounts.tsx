// Hooks and helper functions for handling user's margin accounts are here
import React, { useState, useEffect, useContext, useRef } from "react";
// Import function to create margin account from mango library
import { IDS, MangoGroup, MangoClient, MarginAccount } from "@mango/client";
// Import some mango client functions
import { initMarginAccount } from './mango';
// Connection context
import { useConnection, useConnectionConfig } from '../utils/connection';
// Wallet context
import { useWallet } from '../utils/wallet';
// Type annotations
import { PublicKey } from "@solana/web3.js";
import { MarginAccountContextValues } from "../utils/types";
// Create a context to share account state across pages
const MarginAccountContext = React.createContext<null | MarginAccountContextValues>(null);

// Precision for our mango group token
export const tokenPrecision = {
  BTC: 3,
  ETH: 3,
  USDC: 3
};

// Create the margin account provider
export function MarginAccountProvider({ children }) {
  // Get all state and functions we need for context
  const { marginAccount, marginAccounts, mango_groups, mangoOptions, mangoGroup, mangoClient, createMarginAccount, setMarginAccount, setMarginAccounts, maPending, setMAPending, getMarginAccount } = useMarginAccountHelper();
  // Return a context with this values set as default
  return <MarginAccountContext.Provider
    value={{
      marginAccount,
      marginAccounts,
      mango_groups,
      mangoOptions,
      mangoClient,
      mangoGroup,
      createMarginAccount,
      setMarginAccount,
      setMarginAccounts,
      maPending,
      setMAPending,
      getMarginAccount
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
  const [mango_groups, setMango_Groups] = useState(['BTC', 'ETH', 'USDC']);
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
  const mangoClient = new MangoClient();
  // id for our interval object
  const intervalId = useRef<NodeJS.Timeout>();

  /**
   * @summary Create a margin account for a mango group
   */
  const createMarginAccount = async (): Promise<MarginAccount | null> => {
    if (!mangoGroup) {
      console.error('No mango group selected before creating a margin account');
      setMAPending(prev => { prev['cma'] = false; return prev });
      return null;
    }
    // Carry on if we have mango group
    return await initMarginAccount(connection, new PublicKey(mangoOptions.mango_program_id), mangoGroup, wallet).then(async (marginAccountPK) => {
      // Let's get the margin account object
      let marginAccount = await mangoClient.getMarginAccount(connection, marginAccountPK, mangoOptions.dex_program_id);
      // Now get all margin accounts
      // Set the margin accounts PK
      setMarginAccount(marginAccount);
      getAllMarginAccountsForGroup();
      return marginAccount;
      // setMAPending(prev => { prev['cma'] = false; return prev });
    })
      .catch(err => {
        console.error(err);
        return null;
        // setMAPending(prev => { prev['cma'] = false; return prev }); 
      });
  }

  /**
   * @summary get all margin accounts for a mango group
   * @kehinde - this function is not necessary. mangoClient.getMarginAccountsForOwner already filters for mangoGroup
   */
  const getAllMarginAccountsForGroup = async () => {
    // Set pending transaction
    setMAPending(prev => { prev['sma'] = true; return prev });;
    if (!mangoGroup) {
      // Did the user not make a selection or maybe our effects have not ran
      console.error('No mango group while getting all margin accounts for a group');
      return [];
    }
    // Let's get the public keys for the margin accounts
    await mangoClient.getMarginAccountsForOwner(connection, new PublicKey(mangoOptions.mango_program_id), mangoGroup, wallet)
      .then((marginAccounts) => {
        setMarginAccounts(marginAccounts)
        // If margin account exist, set the first value
        setMAPending(prev => { prev['sma'] = false; return prev; });
        if (marginAccounts.length > 0 && !marginAccount) {
          setMarginAccount(marginAccounts[0]);
        }
      }).catch((err) => {
        console.error('Could not get margin accounts for user in effect ', err);
        setMAPending(prev => { prev['sma'] = false; return prev });
      })
  }

  const getMarginAccount = async (): Promise<MarginAccount | null> => {
    if (!mangoGroup || !marginAccount) {
      // Did the user not make a selection or maybe our effects have not ran
      console.error('No mango group while getting all margin accounts for a group');
      return marginAccount;
    }
    // Let's get the public keys for the margin accounts
    return mangoClient.getMarginAccount(connection, marginAccount.publicKey, new PublicKey(mangoOptions.dex_program_id)).then((account: MarginAccount | null) => {
      // Return the first account
      return account;
    })
      .catch(err => {
        console.error(err);
        return marginAccount
      });
  }

  // If we loose connection to wallet, clear the margin account state
  useEffect(() => {
    if (!connected) {
      // We lost connection to wallet, remove the margin accounts
      setMarginAccount(null);
      // Remove the margin accounts pk
      setMarginAccounts([]);
      setMangoGroup(null);
      return;
    }
    // Set the default mango group
    if (!mangoGroup) {
      // No mango group yet, get the default
      // Did the user make any selection ??
      // Use default mango group of ETH_BTC_USDC
      // Set up default mango group 
      // Get the Mango group. For now we use our default BTC_ETH_USDC
      // TODO: Allow to select a mango group
      let MangoGroup = mangoOptions.mango_groups.BTC_ETH_USDC;
      let mangoGroupPk = new PublicKey(MangoGroup.mango_group_pk);
      // console.log(mangoGroupPk.toBase58());
      mangoClient.getMangoGroup(connection, mangoGroupPk).then((mangoGroup) => {
        // Set the mango group
        setMangoGroup(mangoGroup);
      }).catch(err => {
        console.error('Could not get mango group');
      })
    }
    if (!marginAccounts || !marginAccount) {
      // setMAPending(prev => { prev['sma'] = true; return prev; });
      // No margin account for the user, get them
      getAllMarginAccountsForGroup();
    }
  }, [connected, connection, mangoGroup]);
  // This effect would create a timer to get the user's balance and interest rate for the selected margin account.
  // TODO: Find a beter impl like websocket
  useEffect(() => {
    // Get the balance and interest every 10s
    const id = setTimeout(async () => {
      // Check if margin account exist
      if (!marginAccount) {
        return;
      }
      // Get all margin accounts again
      await getMarginAccount()
        .then((account) => {
          // If the margin account has changed by the time we are done, ignore the state update
          if (account && account.publicKey.toString() === marginAccount.publicKey.toString()) {
            setMarginAccount(account);
          }
        })
        .catch((err) => {
          // COuld not set margin account 
          console.error(err);
        })
    }, 3000);
    intervalId.current = id;
    return () => {
      if (intervalId.current) {
        clearTimeout(intervalId.current);
      }
    }
  }, [marginAccount]);
  // TODO: Should the mango group change, reset our margin accounts and account
  return { marginAccount, marginAccounts, mangoGroup, mangoOptions, mango_groups, mangoClient, createMarginAccount, setMarginAccount, setMarginAccounts, maPending, setMAPending, getMarginAccount };
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
    // Set a key to create a new account
    mapping.set('new', null);
    return mapping;
  }

  return {
    marginAccount: marginAccountContext.marginAccount,
    marginAccounts: marginAccountContext.marginAccounts,
    mango_groups: marginAccountContext.mango_groups,
    mango_options: marginAccountContext.mangoOptions,
    mangoClient: marginAccountContext.mangoClient,
    mangoGroup: marginAccountContext.mangoGroup,
    createMarginAccount: marginAccountContext.createMarginAccount,
    setMarginAccount: marginAccountContext.setMarginAccount,
    setMarginAccounts: marginAccountContext.setMarginAccounts,
    maPending: marginAccountContext.maPending,
    setMAPending: marginAccountContext.setMAPending,
    getMarginAccount: marginAccountContext.getMarginAccount,
    keyMappings: buildPubKeytoAcountMapping,
  }
}
