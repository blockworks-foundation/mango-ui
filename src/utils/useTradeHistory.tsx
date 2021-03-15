import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useFills } from './markets';
import { useMarginAccount } from './marginAccounts';
import { isDefined } from './utils';

const byTimestamp = (a, b) => {
  return new Date(b.loadTimestamp).getTime() - new Date(a.loadTimestamp).getTime();
};

const formatTradeHistory = (newTradeHistory) => {
  return newTradeHistory
    .flat()
    .map((trade, i) => {
      return {
        ...trade,
        marketName: trade.marketName
          ? trade.marketName
          : `${trade.baseCurrency}/${trade.quoteCurrency}`,
        key: `${trade.orderId}${trade.side}`,
        liquidity: trade.maker ? 'Maker' : 'Taker',
      };
    })
    .sort(byTimestamp);
};

export const usePrevious = (value) => {
  const ref = useRef();
  // Store current value in ref
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes
  // Return previous value (happens before update in useEffect above)
  return ref.current;
};

export const useTradeHistory = () => {
  const eventQueueFills = useFills(1000);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [loadingHistory, setloadingHistory] = useState(false);
  const previousEventQueueFills = usePrevious(eventQueueFills);
  const { marginAccount } = useMarginAccount();

  const fetchTradeHistory = useCallback(async () => {
    if (!marginAccount || marginAccount.openOrdersAccounts.length === 0) return null;
    setloadingHistory(true);
    const openOrdersAccounts = marginAccount.openOrdersAccounts.filter(isDefined);
    const publicKeys = openOrdersAccounts.map((act) => act.publicKey.toString());
    const results = await Promise.all(
      publicKeys.map(async (pk) => {
        const response = await fetch(
          `https://stark-fjord-45757.herokuapp.com/trades/open_orders/${pk.toString()}`,
        );

        const parsedResponse = await response.json();
        return parsedResponse?.data ? parsedResponse.data : [];
      }),
    );

    setTradeHistory(formatTradeHistory(results));
    setloadingHistory(false);
  }, [marginAccount, eventQueueFills]);

  useEffect(() => {
    if (marginAccount && tradeHistory.length === 0) {
      fetchTradeHistory();
    }
  }, [marginAccount]);

  useEffect(() => {
    if (
      eventQueueFills &&
      eventQueueFills.length > 0 &&
      JSON.stringify(eventQueueFills) !== JSON.stringify(previousEventQueueFills)
    ) {
      const newFills = eventQueueFills.filter((fill) => {
        return !tradeHistory.find((t) => t.orderId === fill.orderId.toString());
      });
      if (newFills.length > 0) {
        const newTradeHistory = [...newFills, ...tradeHistory];
        const formattedTradeHistory = formatTradeHistory(newTradeHistory);
        setTradeHistory(formattedTradeHistory);
      }
    }
  }, [tradeHistory, eventQueueFills]);

  return { tradeHistory, loadingHistory, fetchTradeHistory };
};
