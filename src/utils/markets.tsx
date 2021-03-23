import { Market, MARKETS, OpenOrders, Orderbook, TokenInstructions } from '@project-serum/serum';
import { PublicKey } from '@solana/web3.js';
import React, { useContext, useEffect, useState } from 'react';
import { useLocalStorageState } from './utils';
import { refreshCache, useAsyncData } from './fetch-loop';
import { useAccountData, useAccountInfo, useConnection, useConnectionConfig } from './connection';
import { useWallet } from './wallet';
import tuple from 'immutable-tuple';
import { notify } from './notifications';
import BN from 'bn.js';
import { getTokenAccountInfo } from './tokens';
import {
  Balances,
  MarketContextValues,
  MarketInfo,
  FullMarketInfo,
  SelectedTokenAccounts,
  TokenAccount,
} from './types';
import { Order } from '@project-serum/serum/lib/market';
import BonfidaApi from './bonfidaConnector';
import { IDS } from '@blockworks-foundation/mango-client';
import { nativeToUi } from '@blockworks-foundation/mango-client/lib/utils';
import { sleep } from './utils';
import { useMarginAccount } from './marginAccounts';
import { NUM_TOKENS } from '@blockworks-foundation/mango-client/lib/layout';
import { DEFAULT_MANGO_GROUP } from './mango';

// Used in debugging, should be false in production
const _IGNORE_DEPRECATED = false;

export const USE_MARKETS: MarketInfo[] = _IGNORE_DEPRECATED
  ? MARKETS.map((m) => ({ ...m, deprecated: false }))
  : MARKETS;

export function useMarketsList() {
  const { endpointInfo } = useConnectionConfig();
  const spotMarkets =
    IDS[endpointInfo!.name]?.mango_groups[DEFAULT_MANGO_GROUP]?.spot_market_symbols || {};

  // If no market for the endpoint, return
  const dexProgram = IDS[endpointInfo!.name]?.dex_program_id || '';
  const mangoMarkets = Object.entries(spotMarkets).map(([name, address]) => {
    return {
      address: new PublicKey(address as string),
      programId: new PublicKey(dexProgram as string),
      deprecated: false,
      name,
    };
  });

  return mangoMarkets;
}

export function useDefaultMarket() {
  const marketsList = useMarketsList();
  return marketsList[0];
}

export function useAllMarkets() {
  const connection = useConnection();
  const marketsList = useMarketsList();

  const getAllMarkets = async () => {
    // If no market list, return null
    const markets: Array<{
      market: Market;
      marketName: string;
      programId: PublicKey;
    } | null> = await Promise.all(
      marketsList.map(async (marketInfo) => {
        try {
          const market = await Market.load(
            connection,
            marketInfo.address,
            {},
            marketInfo.programId,
          );
          return {
            market,
            marketName: marketInfo.name,
            programId: marketInfo.programId,
          };
        } catch (e) {
          notify({
            message: 'Error loading all market',
            description: e.message,
            type: 'error',
          });
          return null;
        }
      }),
    );
    return markets.filter(
      (m): m is { market: Market; marketName: string; programId: PublicKey } => !!m,
    );
  };
  return useAsyncData(getAllMarkets, tuple('getAllMarkets', marketsList.length, connection), {
    refreshInterval: _VERY_SLOW_REFRESH_INTERVAL,
  });
}

export function useUnmigratedOpenOrdersAccounts() {
  const connection = useConnection();
  const { wallet } = useWallet();

  async function getUnmigratedOpenOrdersAccounts(): Promise<OpenOrders[]> {
    if (!wallet || !connection || !wallet.publicKey) {
      return [];
    }
    // console.log('refreshing useUnmigratedOpenOrdersAccounts');
    let deprecatedOpenOrdersAccounts: OpenOrders[] = [];
    const deprecatedProgramIds = Array.from(
      new Set(
        USE_MARKETS.filter(({ deprecated }) => deprecated).map(({ programId }) =>
          programId.toBase58(),
        ),
      ),
    ).map((publicKeyStr) => new PublicKey(publicKeyStr));
    let programId: PublicKey;
    for (programId of deprecatedProgramIds) {
      try {
        const openOrdersAccounts = await OpenOrders.findForOwner(
          connection,
          wallet.publicKey,
          programId,
        );
        deprecatedOpenOrdersAccounts = deprecatedOpenOrdersAccounts.concat(
          openOrdersAccounts
            .filter(
              (openOrders) =>
                openOrders.baseTokenTotal.toNumber() || openOrders.quoteTokenTotal.toNumber(),
            )
            .filter((openOrders) =>
              USE_MARKETS.some(
                (market) => market.deprecated && market.address.equals(openOrders.market),
              ),
            ),
        );
      } catch (e) {
        // console.log('Error loading deprecated markets', programId?.toBase58(), e.message);
      }
    }
    // Maybe sort
    return deprecatedOpenOrdersAccounts;
  }

  const cacheKey = tuple(
    'getUnmigratedOpenOrdersAccounts',
    connection,
    wallet?.publicKey?.toBase58(),
  );
  const [accounts] = useAsyncData(getUnmigratedOpenOrdersAccounts, cacheKey, {
    refreshInterval: _VERY_SLOW_REFRESH_INTERVAL,
  });

  return {
    accounts,
    refresh: (clearCache: boolean) => refreshCache(cacheKey, clearCache),
  };
}

const MarketContext: React.Context<null | MarketContextValues> = React.createContext<null | MarketContextValues>(
  null,
);

const _VERY_SLOW_REFRESH_INTERVAL = 5000 * 1000;

// For things that don't really change
const _SLOW_REFRESH_INTERVAL = 5 * 1000;

// For things that change frequently
const _FAST_REFRESH_INTERVAL = 1000;

export const DEFAULT_MARKET = USE_MARKETS.find(
  ({ name, deprecated }) => name === 'SRM/USDT' && !deprecated,
);

const formatTokenMints = (symbols: { [name: string]: string }) => {
  return Object.entries(symbols).map(([name, address]) => {
    return {
      address: new PublicKey(address),
      name: name,
    };
  });
};

export function getMarketDetails(
  market: Market | undefined | null,
  endpointInfo = { name: 'devnet' },
): FullMarketInfo {
  if (!market) {
    return {};
  }
  const TOKEN_MINTS = formatTokenMints(IDS[endpointInfo!.name]?.symbols);

  const baseCurrency =
    (market?.baseMintAddress &&
      TOKEN_MINTS.find((token) => token.address.equals(market.baseMintAddress))?.name) ||
    'UNKNOWN';
  const quoteCurrency =
    (market?.quoteMintAddress &&
      TOKEN_MINTS.find((token) => token.address.equals(market.quoteMintAddress))?.name) ||
    'UNKNOWN';

  return {
    baseCurrency,
    quoteCurrency,
  };
}

export function MarketProvider({ marketAddress, setMarketAddress, children }) {
  const address = marketAddress && new PublicKey(marketAddress);
  const connection = useConnection();
  const { endpointInfo } = useConnectionConfig();
  const marketInfos = useMarketsList();
  const marketInfo = address && marketInfos.find((market) => market.address.equals(address));
  const [market, setMarket] = useState<Market | null>();

  useEffect(() => {
    if (marketInfos.length > 0) {
      setMarketAddress(marketInfos[0].address.toBase58());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointInfo]);

  // Replace existing market with a non-deprecated one on first load
  useEffect(() => {
    if (marketInfo && marketInfo.deprecated) {
      // console.log('Switching markets from deprecated', marketInfo);
      if (DEFAULT_MARKET) {
        setMarketAddress(DEFAULT_MARKET.address.toBase58());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      market &&
      marketInfo &&
      // @ts-ignore
      market._decoded.ownAddress?.equals(marketInfo?.address)
    ) {
      return;
    }
    setMarket(null);
    if (!marketInfo || !marketInfo.address) {
      notify({
        message: 'Error loading market',
        description: 'Please select a market from the dropdown',
        type: 'error',
      });
      return;
    }
    Market.load(connection, marketInfo.address, {}, marketInfo.programId)
      .then(setMarket)
      .catch((e) =>
        notify({
          message: 'Error loading market',
          description: e.message,
          type: 'error',
        }),
      );
    // eslint-disable-next-line
  }, [connection, marketInfo]);

  return (
    <MarketContext.Provider
      value={{
        address,
        market,
        marketName: marketInfo?.name,
        setMarketAddress,
        ...getMarketDetails(market, endpointInfo),
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function getTradePageUrl(marketAddress?: string) {
  if (!marketAddress) {
    const saved = localStorage.getItem('marketAddress');
    if (saved) {
      marketAddress = JSON.parse(saved);
    }
    marketAddress = marketAddress || DEFAULT_MARKET?.address.toBase58() || '';
  }
  return `/market/${marketAddress}`;
}

export function useSelectedTokenAccounts(): [
  SelectedTokenAccounts,
  (newSelectedTokenAccounts: SelectedTokenAccounts) => void,
] {
  const [
    selectedTokenAccounts,
    setSelectedTokenAccounts,
  ] = useLocalStorageState<SelectedTokenAccounts>('selectedTokenAccounts', {});
  return [selectedTokenAccounts, setSelectedTokenAccounts];
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('Missing market context');
  }
  return context;
}

export function useMarkPrice() {
  const [markPrice, setMarkPrice] = useState<null | number>(null);

  const [orderbook] = useOrderbook();
  const trades = useTrades();

  useEffect(() => {
    let bb = orderbook?.bids?.length > 0 && Number(orderbook.bids[0][0]);
    let ba = orderbook?.asks?.length > 0 && Number(orderbook.asks[0][0]);
    let last = trades && trades.length > 0 && trades[0].price;

    let markPrice =
      bb && ba ? (last ? [bb, ba, last].sort((a, b) => a - b)[1] : (bb + ba) / 2) : null;

    setMarkPrice(markPrice);
  }, [orderbook, trades]);

  return markPrice;
}

export function _useUnfilteredTrades(limit = 10000) {
  const { market } = useMarket();
  const connection = useConnection();
  async function getUnfilteredTrades(): Promise<any[] | null> {
    if (!market || !connection) {
      return null;
    }
    const loadedFills = await market.loadFills(connection, limit);

    return loadedFills;
  }
  const [trades] = useAsyncData(
    getUnfilteredTrades,
    tuple('getUnfilteredTrades', market, connection),
    { refreshInterval: _SLOW_REFRESH_INTERVAL },
  );
  return trades;
  // NOTE: For now, websocket is too expensive since the event queue is large
  // and updates very frequently

  // let data = useAccountData(market && market._decoded.eventQueue);
  // if (!data) {
  //   return null;
  // }
  // const events = decodeEventQueue(data, limit);
  // return events
  //   .filter((event) => event.eventFlags.fill && event.nativeQuantityPaid.gtn(0))
  //   .map(market.parseFillEvent.bind(market));
}

export function useBonfidaTrades() {
  const { market } = useMarket();
  const marketAddress = market?.address.toBase58();

  async function getBonfidaTrades() {
    if (!marketAddress) {
      return null;
    }
    return await BonfidaApi.getRecentTrades(marketAddress);
  }

  return useAsyncData(
    getBonfidaTrades,
    tuple('getBonfidaTrades', marketAddress),
    { refreshInterval: _SLOW_REFRESH_INTERVAL },
    false,
  );
}

export function useOrderbookAccounts() {
  const { market } = useMarket();
  // @ts-ignore
  let bidData = useAccountData(market && market._decoded.bids);
  // @ts-ignore
  let askData = useAccountData(market && market._decoded.asks);
  return {
    bidOrderbook: market && bidData ? Orderbook.decode(market, bidData) : null,
    askOrderbook: market && askData ? Orderbook.decode(market, askData) : null,
  };
}

export function useOrderbook(depth = 20): [{ bids: number[][]; asks: number[][] }, boolean] {
  const { bidOrderbook, askOrderbook } = useOrderbookAccounts();
  const { market } = useMarket();
  const bids =
    !bidOrderbook || !market ? [] : bidOrderbook.getL2(depth).map(([price, size]) => [price, size]);
  const asks =
    !askOrderbook || !market ? [] : askOrderbook.getL2(depth).map(([price, size]) => [price, size]);
  return [{ bids, asks }, !!bids || !!asks];
}

// Want the balances table to be fast-updating, dont want open orders to flicker
// TODO: Update to use websocket
export function useOpenOrdersAccounts(fast = false) {
  const { market } = useMarket();
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  async function getOpenOrdersAccounts() {
    if (!connected) {
      return null;
    }
    if (!market) {
      return null;
    }
    return await market.findOpenOrdersAccountsForOwner(connection, wallet.publicKey);
  }
  return useAsyncData(
    getOpenOrdersAccounts,
    tuple('getOpenOrdersAccounts', wallet, market, connected),
    { refreshInterval: fast ? _FAST_REFRESH_INTERVAL : _SLOW_REFRESH_INTERVAL },
  );
}

export function useSelectedOpenOrdersAccount(fast = false) {
  const [accounts] = useOpenOrdersAccounts(fast);
  if (!accounts) {
    return null;
  }
  return accounts[0];
}

export function useTokenAccounts(): [TokenAccount[] | null | undefined, boolean] {
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  async function getTokenAccounts() {
    if (!connected) {
      return null;
    }
    return await getTokenAccountInfo(connection, wallet.publicKey);
  }
  return useAsyncData(getTokenAccounts, tuple('getTokenAccounts', wallet, connected), {
    refreshInterval: _SLOW_REFRESH_INTERVAL,
  });
}

export function getSelectedTokenAccountForMint(
  accounts: TokenAccount[] | undefined | null,
  mint: PublicKey | undefined,
  selectedPubKey?: string | PublicKey | null,
) {
  if (!accounts || !mint) {
    return null;
  }
  const filtered = accounts.filter(
    ({ effectiveMint, pubkey }) =>
      mint.equals(effectiveMint) &&
      (!selectedPubKey ||
        (typeof selectedPubKey === 'string' ? selectedPubKey : selectedPubKey.toBase58()) ===
          pubkey.toBase58()),
  );
  return filtered && filtered[0];
}

export function useSelectedQuoteCurrencyAccount() {
  const [accounts] = useTokenAccounts();
  const { market } = useMarket();
  const [selectedTokenAccounts] = useSelectedTokenAccounts();
  const mintAddress = market?.quoteMintAddress;
  return getSelectedTokenAccountForMint(
    accounts,
    mintAddress,
    mintAddress && selectedTokenAccounts[mintAddress.toBase58()],
  );
}

export function useSelectedBaseCurrencyAccount() {
  const [accounts] = useTokenAccounts();
  const { market } = useMarket();
  const [selectedTokenAccounts] = useSelectedTokenAccounts();
  const mintAddress = market?.baseMintAddress;
  return getSelectedTokenAccountForMint(
    accounts,
    mintAddress,
    mintAddress && selectedTokenAccounts[mintAddress.toBase58()],
  );
}

// TODO: Update to use websocket
export function useSelectedQuoteCurrencyBalances() {
  const quoteCurrencyAccount = useSelectedQuoteCurrencyAccount();
  const { market } = useMarket();
  const [accountInfo, loaded] = useAccountInfo(quoteCurrencyAccount?.pubkey);
  if (!market || !quoteCurrencyAccount || !loaded || !accountInfo) {
    return null;
  }
  if (market.quoteMintAddress.equals(TokenInstructions.WRAPPED_SOL_MINT)) {
    return accountInfo?.lamports / 1e9 ?? 0;
  }
  return market.quoteSplSizeToNumber(new BN(accountInfo.data.slice(64, 72), 10, 'le'));
}

// TODO: Update to use websocket
export function useSelectedBaseCurrencyBalances() {
  const baseCurrencyAccount = useSelectedBaseCurrencyAccount();
  const { market } = useMarket();
  const [accountInfo, loaded] = useAccountInfo(baseCurrencyAccount?.pubkey);
  if (!market || !baseCurrencyAccount || !loaded || !accountInfo) {
    return null;
  }
  if (market.baseMintAddress.equals(TokenInstructions.WRAPPED_SOL_MINT)) {
    return accountInfo?.lamports / 1e9 ?? 0;
  }
  return market.baseSplSizeToNumber(new BN(accountInfo.data.slice(64, 72), 10, 'le'));
}

export function useOpenOrders() {
  const { market } = useMarket();
  const { marginAccount, mangoGroup } = useMarginAccount();
  const { bidOrderbook, askOrderbook } = useOrderbookAccounts();
  const { endpointInfo } = useConnectionConfig();

  if (!market || !mangoGroup || !marginAccount) return null;

  const marketIndex = mangoGroup.getMarketIndex(market);
  const openOrdersAccount = marginAccount.openOrdersAccounts[marketIndex];
  if (!openOrdersAccount || !bidOrderbook || !askOrderbook) {
    return null;
  }
  const spotMarketFromIDs = Object.entries(IDS[endpointInfo!.name].spot_markets).find(
    ([symbol, address]) => {
      return market.address.toString() === address;
    },
  );
  const marketName = spotMarketFromIDs ? spotMarketFromIDs[0] : '';

  return market
    .filterForOpenOrders(bidOrderbook, askOrderbook, [openOrdersAccount])
    .map((order) => ({ ...order, marketName, market }));
}

export function useTrades(limit = 100) {
  const trades = _useUnfilteredTrades(limit);
  if (!trades) {
    return null;
  }
  // Until partial fills are each given their own fill, use maker fills
  return trades
    .filter(({ eventFlags }) => eventFlags.maker)
    .map((trade) => ({
      ...trade,
      side: trade.side === 'buy' ? 'sell' : 'buy',
    }));
}

export function useLocallyStoredFeeDiscountKey(): {
  storedFeeDiscountKey: PublicKey | undefined;
  setStoredFeeDiscountKey: (key: string) => void;
} {
  const [storedFeeDiscountKey, setStoredFeeDiscountKey] = useLocalStorageState<string>(
    `feeDiscountKey`,
    undefined,
  );
  return {
    storedFeeDiscountKey: storedFeeDiscountKey ? new PublicKey(storedFeeDiscountKey) : undefined,
    setStoredFeeDiscountKey,
  };
}

export function useFeeDiscountKeys(): [
  (
    | {
        pubkey: PublicKey;
        feeTier: number;
        balance: number;
        mint: PublicKey;
      }[]
    | null
    | undefined
  ),
  boolean,
] {
  const { market } = useMarket();
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  const { setStoredFeeDiscountKey } = useLocallyStoredFeeDiscountKey();
  let getFeeDiscountKeys = async () => {
    if (!connected) {
      return null;
    }
    if (!market) {
      return null;
    }
    const feeDiscountKey = await market.findFeeDiscountKeys(connection, wallet.publicKey);
    if (feeDiscountKey.length) {
      setStoredFeeDiscountKey(feeDiscountKey[0].pubkey.toBase58());
    }
    return feeDiscountKey;
  };
  return useAsyncData(getFeeDiscountKeys, tuple('getFeeDiscountKeys', wallet, market, connected), {
    refreshInterval: _SLOW_REFRESH_INTERVAL,
  });
}

export function useFills(limit = 100) {
  const { market, marketName } = useMarket();
  const { marginAccount, mangoGroup } = useMarginAccount();

  const fills = _useUnfilteredTrades(limit);
  // const [openOrdersAccounts] = useOpenOrdersAccounts();

  let openOrdersAccounts;
  if (market && mangoGroup && marginAccount) {
    const marketIndex = mangoGroup.getMarketIndex(market);
    const openOrdersAccount = marginAccount.openOrdersAccounts[marketIndex];
    openOrdersAccounts = openOrdersAccount ? [openOrdersAccount] : null;
  } else {
    openOrdersAccounts = [];
  }

  if (!openOrdersAccounts || openOrdersAccounts.length === 0) {
    return null;
  }
  if (!fills) {
    return null;
  }
  return fills
    .filter((fill) =>
      openOrdersAccounts.some((openOrdersAccount) =>
        fill.openOrders.equals(openOrdersAccount.publicKey),
      ),
    )
    .map((fill) => ({ ...fill, marketName }));
}

export const useAllOpenOrders = (): {
  openOrders: { orders: Order[]; marketAddress: string }[] | null | undefined;
  loaded: boolean;
  refreshOpenOrders: () => void;
} => {
  const connection = useConnection();
  const { connected, wallet } = useWallet();
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [openOrders, setOpenOrders] = useState<
    { orders: Order[]; marketAddress: string }[] | null | undefined
  >(null);
  const [lastRefresh, setLastRefresh] = useState(0);

  const refreshOpenOrders = () => {
    if (new Date().getTime() - lastRefresh > 10 * 1000) {
      setRefresh((prev) => prev + 1);
    } else {
      // console.log('not refreshing');
    }
  };

  useEffect(() => {
    if (connected) {
      const getAllOpenOrders = async () => {
        setLoaded(false);
        const _openOrders: { orders: Order[]; marketAddress: string }[] = [];
        const getOpenOrdersForMarket = async (marketInfo: MarketInfo) => {
          await sleep(1000 * Math.random()); // Try not to hit rate limit
          try {
            const market = await Market.load(
              connection,
              marketInfo.address,
              undefined,
              marketInfo.programId,
            );
            const orders = await market.loadOrdersForOwner(connection, wallet?.publicKey, 30000);
            _openOrders.push({
              orders: orders,
              marketAddress: marketInfo.address.toBase58(),
            });
          } catch (e) {
            console.warn(`Error loading open order ${marketInfo.name} - ${e}`);
          }
        };
        await Promise.all(USE_MARKETS.map((m) => getOpenOrdersForMarket(m)));
        setOpenOrders(_openOrders);
        setLastRefresh(new Date().getTime());
        setLoaded(true);
      };
      getAllOpenOrders();
    }
  }, [connected, wallet, refresh]);
  return {
    openOrders: openOrders,
    loaded: loaded,
    refreshOpenOrders: refreshOpenOrders,
  };
};

export function useBalances(): Balances[] {
  const baseCurrencyBalances = useSelectedBaseCurrencyBalances();
  const quoteCurrencyBalances = useSelectedQuoteCurrencyBalances();
  const { baseCurrency, quoteCurrency, market } = useMarket();
  const { marginAccount, mangoGroup, mango_groups } = useMarginAccount();
  if (!marginAccount || !mangoGroup || !market) {
    return [];
  }

  let openOrders;
  const marketIndex = mangoGroup.getMarketIndex(market);
  openOrders = marginAccount.openOrdersAccounts[marketIndex];
  const baseCurrencyIndex = mango_groups.findIndex((x) => x === baseCurrency);
  const quoteCurrencyIndex = mango_groups.findIndex((x) => x === quoteCurrency);

  if (
    baseCurrency === 'UNKNOWN' ||
    quoteCurrency === 'UNKNOWN' ||
    !baseCurrency ||
    !quoteCurrency
  ) {
    return [];
  }

  const nativeBaseFree = openOrders?.baseTokenFree || 0;
  const nativeQuoteFree = openOrders?.quoteTokenFree || 0;

  const nativeBaseLocked = openOrders ? openOrders.baseTokenTotal - nativeBaseFree : 0;
  const nativeQuoteLocked = openOrders ? openOrders?.quoteTokenTotal - nativeQuoteFree : 0;

  const nativeBaseUnsettled = openOrders?.baseTokenFree || 0;
  const nativeQuoteUnsettled = openOrders?.quoteTokenFree || 0;
  const tokenIndex = marketIndex;

  const net = (borrows, currencyIndex) => {
    return (
      marginAccount.getNativeDeposit(mangoGroup, currencyIndex) +
      borrows -
      marginAccount.getNativeBorrow(mangoGroup, currencyIndex)
    );
  };

  return [
    {
      market,
      key: `${baseCurrency}${quoteCurrency}${baseCurrency}`,
      coin: baseCurrency,
      wallet: baseCurrencyBalances,
      marginDeposits:
        mangoGroup && marginAccount
          ? marginAccount.getUiDeposit(mangoGroup, baseCurrencyIndex)
          : null,
      borrows: marginAccount.getUiBorrow(mangoGroup, baseCurrencyIndex),
      orders: nativeToUi(nativeBaseLocked, mangoGroup.mintDecimals[tokenIndex]),
      openOrders,
      unsettled: nativeToUi(nativeBaseUnsettled, mangoGroup.mintDecimals[tokenIndex]),
      net: nativeToUi(net(nativeBaseLocked, tokenIndex), mangoGroup.mintDecimals[tokenIndex]),
    },
    {
      market,
      key: `${quoteCurrency}${baseCurrency}${quoteCurrency}`,
      coin: quoteCurrency,
      wallet: quoteCurrencyBalances,
      marginDeposits:
        mangoGroup && marginAccount
          ? marginAccount.getUiDeposit(mangoGroup, quoteCurrencyIndex)
          : null,
      borrows: marginAccount.getUiBorrow(mangoGroup, quoteCurrencyIndex),
      openOrders,
      orders: nativeToUi(nativeQuoteLocked, mangoGroup.mintDecimals[NUM_TOKENS - 1]),
      unsettled: nativeToUi(nativeQuoteUnsettled, mangoGroup.mintDecimals[NUM_TOKENS - 1]),
      net: nativeToUi(
        net(nativeQuoteLocked, NUM_TOKENS - 1),
        mangoGroup.mintDecimals[NUM_TOKENS - 1],
      ),
    },
  ];
}

export function useUnmigratedDeprecatedMarkets() {
  const connection = useConnection();
  const { accounts } = useUnmigratedOpenOrdersAccounts();
  const marketsList =
    accounts && Array.from(new Set(accounts.map((openOrders) => openOrders.market)));
  const deps = marketsList && marketsList.map((m) => m.toBase58());

  const useUnmigratedDeprecatedMarketsInner = async () => {
    if (!marketsList) {
      return null;
    }
    const getMarket = async (address) => {
      const marketInfo = USE_MARKETS.find((market) => market.address.equals(address));
      if (!marketInfo) {
        // console.log('Failed loading market');
        notify({
          message: 'Error loading market',
          type: 'error',
        });
        return null;
      }
      try {
        // console.log('Loading market', marketInfo.name);
        // NOTE: Should this just be cached by (connection, marketInfo.address, marketInfo.programId)?
        return await Market.load(connection, marketInfo.address, {}, marketInfo.programId);
      } catch (e) {
        // console.log('Failed loading market', marketInfo.name, e);
        notify({
          message: 'Error loading market',
          description: e.message,
          type: 'error',
        });
        return null;
      }
    };
    return (await Promise.all(marketsList.map(getMarket))).filter((x) => x);
  };
  const [markets] = useAsyncData(
    useUnmigratedDeprecatedMarketsInner,
    tuple('useUnmigratedDeprecatedMarketsInner', connection, deps && deps.toString()),
    { refreshInterval: _VERY_SLOW_REFRESH_INTERVAL },
  );
  if (!markets) {
    return null;
  }
  return markets.map((market) => ({
    market,
    openOrdersList: accounts?.filter(
      (openOrders) => market && openOrders.market.equals(market.address),
    ),
  }));
}
