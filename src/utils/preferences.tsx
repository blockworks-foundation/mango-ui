import React, { useContext } from 'react';
import { useLocalStorageState } from './utils';
import { useInterval } from './useInterval';
import { useConnection } from './connection';
import { useWallet } from './wallet';
import { useAllMarkets, useSelectedTokenAccounts, useTokenAccounts } from './markets';
import { PreferencesContextValues } from './types';
import { useMarginAccount } from './marginAccounts';
import { settleAll } from './mango';

const PreferencesContext = React.createContext<PreferencesContextValues | null>(null);

export function PreferencesProvider({ children }) {
  const [autoSettleEnabled, setAutoSettleEnabled] = useLocalStorageState('autoSettleEnabled', true);

  // const [tokenAccounts] = useTokenAccounts();
  const { connected, wallet } = useWallet();
  const { mango_options, mangoGroup, marginAccount } = useMarginAccount();
  const [marketList] = useAllMarkets();
  const connection = useConnection();
  // const [selectedTokenAccounts] = useSelectedTokenAccounts();

  // useInterval(() => {
  //   const autoSettle = async () => {
  //     const markets = (marketList || []).map((m) => m.market);
  //     try {
  //       if (!mangoGroup || !marginAccount) return;
  //       await settleAll(
  //         connection,
  //         mango_options.mango_program_id,
  //         mangoGroup,
  //         marginAccount,
  //         markets,
  //         wallet,
  //       );
  //     } catch (e) {
  //       console.log('Error auto settling funds: ' + e.message);
  //     }
  //   };

  //   connected && wallet?.autoApprove && autoSettleEnabled && autoSettle();
  // }, 10000);

  return (
    <PreferencesContext.Provider
      value={{
        autoSettleEnabled,
        setAutoSettleEnabled,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('Missing preferences context');
  }
  return {
    autoSettleEnabled: context.autoSettleEnabled,
    setAutoSettleEnabled: context.setAutoSettleEnabled,
  };
}
