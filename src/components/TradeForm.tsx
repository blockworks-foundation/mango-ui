import { Button, Input, Radio, Switch, Select, Slider } from 'antd';
import React, { useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import { PublicKey } from '@solana/web3.js';
import { IDS } from '@blockworks-foundation/mango-client';
import { useMarket, useMarkPrice, useOrderbook } from '../utils/markets';
import { useWallet } from '../utils/wallet';
import { notify } from '../utils/notifications';
import { getDecimalCount, roundToDecimal, floorToDecimal } from '../utils/utils';
import { useSendConnection, useConnection, useConnectionConfig } from '../utils/connection';
import { useIpAddress } from '../utils/useIpAddress';
import FloatingElement from './layout/FloatingElement';
import { getUnixTs } from '../utils/send';
import { placeAndSettle } from '../utils/mango';
import { SwitchChangeEventHandler } from 'antd/es/switch';
import { refreshCache } from '../utils/fetch-loop';
import tuple from 'immutable-tuple';
import { useMarginAccount } from '../utils/marginAccounts';

const SellButton = styled(Button)`
  margin: 20px 0px 0px 0px;
  background: #e54033;
  border-color: #e54033;
`;

const BuyButton = styled(Button)`
  margin: 20px 0px 0px 0px;
  color: #141026;
  background: #9bd104;
  border-color: #9bd104;
`;

interface MarginInfo {
  leverage: number;
  prices: number[];
  equity: number;
  liabsVal: number;
  assetsVal: number;
  deposits: number[];
  borrows: number[];
}

const calculateMarketPrice = (orderBook: Array<any>, size: number, side: string) => {
  let acc = 0;
  let selectedOrder;
  for (let order of orderBook) {
    acc += order[1];
    if (acc >= size) {
      selectedOrder = order;
      break;
    }
  }

  if (side === 'buy') {
    return selectedOrder[0] * 1.05;
  } else {
    return selectedOrder[0] * 0.95;
  }
};

export default function TradeForm({
  style,
  setChangeOrderRef,
}: {
  style?: any;
  setChangeOrderRef?: (ref: ({ size, price }: { size?: number; price?: number }) => void) => void;
}) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const { address, baseCurrency, quoteCurrency, market } = useMarket();
  const { wallet, connected } = useWallet();
  const sendConnection = useSendConnection();

  const connection = useConnection();
  const { endpointInfo } = useConnectionConfig();
  const { marginAccount, mangoGroup, size } = useMarginAccount();
  const markPrice = useMarkPrice();
  const [orderbook] = useOrderbook();

  const { ipAllowed } = useIpAddress();

  const [postOnly, setPostOnly] = useState(false);
  const [ioc, setIoc] = useState(false);
  const [baseSize, setBaseSize] = useState<number | undefined>(undefined);
  const [quoteSize, setQuoteSize] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [sizeFraction, setSizeFraction] = useState(0);
  const [tradeType, setTradeType] = useState('Limit');
  const [marginInfo, setMarginInfo] = useState<MarginInfo>({
    leverage: 0,
    prices: [],
    equity: 0,
    liabsVal: 0,
    deposits: [],
    assetsVal: 0,
    borrows: [],
  });

  let sizeDecimalCount = market?.minOrderSize && getDecimalCount(market.minOrderSize);
  let priceDecimalCount = market?.tickSize && getDecimalCount(market.tickSize);

  useEffect(() => {
    setChangeOrderRef && setChangeOrderRef(doChangeOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setChangeOrderRef]);

  useEffect(() => {
    if (!price && markPrice && tradeType !== 'Market') {
      setPrice(markPrice);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, baseSize, quoteSize]);

  useEffect(() => {
    const calculateAccountMarginInfo = async () => {
      if (!mangoGroup || !marginAccount) return;
      const prices = await mangoGroup.getPrices(connection);
      const equity = marginAccount.computeValue(mangoGroup, prices);
      const leverage = equity ? 1 / (marginAccount.getCollateralRatio(mangoGroup, prices) - 1) : 0;
      const liabsVal = marginAccount.getLiabsVal(mangoGroup, prices);
      const assetsVal = marginAccount.getAssetsVal(mangoGroup, prices);
      const deposits = marginAccount.getDeposits(mangoGroup);
      const borrows = marginAccount.getLiabs(mangoGroup);

      setMarginInfo((prevMarginInfo) => ({
        ...prevMarginInfo,
        leverage,
        prices,
        equity,
        liabsVal,
        deposits,
        assetsVal,
        borrows,
      }));
    };
    calculateAccountMarginInfo();
  }, [connection, mangoGroup, marginAccount]);

  // Set the price from the balance comp
  useEffect(() => {
    if (size.currency) {
      if (size.currency === baseCurrency) {
        // onSetBaseSize(size.size);
      } else {
        // onSetQuoteSize(size.size);
      }
    }
  }, [size]);

  useEffect(() => {
    const warmUpCache = async () => {
      try {
        if (!wallet || !wallet.publicKey || !market) {
          console.log(`Skipping refreshing accounts`);
          return;
        }
        const startTime = getUnixTs();
        console.log(`Refreshing accounts for ${market.address}`);
        await market?.findOpenOrdersAccountsForOwner(sendConnection, wallet.publicKey);
        // await market?.findBestFeeDiscountKey(sendConnection, wallet.publicKey);
        const endTime = getUnixTs();
        console.log(
          `Finished refreshing accounts for ${market.address} after ${endTime - startTime}`,
        );
      } catch (e) {
        console.log(`Encountered error when refreshing trading accounts: ${e}`);
      }
    };
    warmUpCache();
    const id = setInterval(warmUpCache, 30_000);
    return () => clearInterval(id);
  }, [market, sendConnection, wallet, wallet.publicKey]);

  const onSetBaseSize = (baseSize: number | undefined) => {
    setBaseSize(baseSize);
    if (!baseSize) {
      setQuoteSize(undefined);
      return;
    }
    let usePrice = price || markPrice;
    if (!usePrice) {
      setQuoteSize(undefined);
      return;
    }
    const rawQuoteSize = baseSize * usePrice;
    const quoteSize = baseSize && roundToDecimal(rawQuoteSize, sizeDecimalCount);
    setQuoteSize(quoteSize);
  };

  const onSetQuoteSize = (quoteSize: number | undefined) => {
    setQuoteSize(quoteSize);
    if (!quoteSize) {
      setBaseSize(undefined);
      return;
    }
    let usePrice = price || markPrice;
    if (!usePrice) {
      setBaseSize(undefined);
      return;
    }
    const rawBaseSize = quoteSize / usePrice;
    const baseSize = quoteSize && roundToDecimal(rawBaseSize, sizeDecimalCount);
    setBaseSize(baseSize);
  };

  const doChangeOrder = ({ size, price }: { size?: number; price?: number }) => {
    const formattedSize = size && roundToDecimal(size, sizeDecimalCount);
    const formattedPrice = price && roundToDecimal(price, priceDecimalCount);
    formattedSize && onSetBaseSize(formattedSize);
    formattedPrice && setPrice(formattedPrice);
  };

  const onSliderChange = (value) => {
    console.log('value', value);

    if (marginAccount && mangoGroup && typeof value === 'number') {
      setSizeFraction(value);
      value ? onSetBaseSize(value) : onSetBaseSize(undefined);
    }
  };

  const getSliderMax = () => {
    // leverage = 1 / (marginInfo.assetsVal / marginInfo.liabsVal - 1)

    // side === 'buy' ?

    if (marginInfo.equity && orderbook.asks.length && sizeDecimalCount && market && mangoGroup) {
      const marketIndex = mangoGroup.getMarketIndex(market);

      const marketPrice = side === 'buy' ? orderbook.asks[0][0] : orderbook.bids[0][0];
      let marketOrLimitPrice = marketPrice;
      if (tradeType === 'Limit') {
        marketOrLimitPrice = price ? price : marketPrice;
      }

      const maxSize = (marginInfo.equity / marketOrLimitPrice) * 6;

      // const liabsVal = marginInfo.liabsVal / marketPrice;
      // const assetsVal = marginInfo.assetsVal / marketPrice;

      // console.log('assetsVal, liabsVal', assetsVal, liabsVal);
      // const sliderMax = side === 'buy' ? maxSize - marginInfo.deposits[marketIndex] : maxSize;
      // console.log('-maxSize-btc dep-', maxSize, marginInfo.deposits[marketIndex]);

      const sliderMax =
        side === 'buy'
          ? maxSize - marginInfo.deposits[marketIndex]
          : maxSize + marginInfo.deposits[marketIndex];
      console.log('max=======', roundToDecimal(sliderMax < 0 ? 0 : sliderMax, sizeDecimalCount));

      return roundToDecimal(sliderMax < 0 ? 0 : sliderMax, sizeDecimalCount);
    } else {
      return 0;
    }
  };

  const getSliderStep = () => {
    return sizeDecimalCount ? 1 / 10 ** sizeDecimalCount : 0;
  };

  const getSliderMin = () => {
    if (getSliderMax() === 0) {
      return 1;
    } else {
      return 0;
    }
  };

  const postOnChange: SwitchChangeEventHandler = (checked) => {
    if (checked) {
      setIoc(false);
    }
    setPostOnly(checked);
  };
  const iocOnChange: SwitchChangeEventHandler = (checked) => {
    if (checked) {
      setPostOnly(false);
    }
    setIoc(checked);
  };

  async function onSubmit() {
    if (!price && tradeType === 'Limit') {
      console.warn('Missing price');
      notify({
        message: 'Missing price',
        type: 'error',
      });
      return;
    } else if (!baseSize) {
      console.warn('Missing size');
      notify({
        message: 'Missing size',
        type: 'error',
      });
      return;
    }
    console.log('checking if we can call place order', {
      mangoGroup,
      address,
      marginAccount,
      market,
    });

    if (!mangoGroup || !address || !marginAccount || !market) return;
    setSubmitting(true);

    try {
      let calculatedPrice;
      if (tradeType === 'Market') {
        calculatedPrice =
          side === 'buy'
            ? calculateMarketPrice(orderbook.asks, size.size, side)
            : calculateMarketPrice(orderbook.bids, size.size, side);
      }

      await placeAndSettle(
        connection,
        new PublicKey(IDS[endpointInfo!.name].mango_program_id),
        mangoGroup,
        marginAccount,
        market,
        wallet,
        side,
        calculatedPrice ?? price,
        baseSize,
        ioc ? 'ioc' : postOnly ? 'postOnly' : 'limit',
      );

      refreshCache(tuple('getTokenAccounts', wallet, connected));
      setPrice(undefined);
      onSetBaseSize(undefined);
    } catch (e) {
      console.warn(e);
      notify({
        message: 'Error placing order',
        description: e.message,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const handleTradeTypeChange = (tradeType) => {
    setTradeType(tradeType);
    if (tradeType === 'Market') {
      setIoc(true);
      setPrice(undefined);
    } else {
      const limitPrice = side === 'buy' ? orderbook.asks[0][0] : orderbook.bids[0][0];
      setPrice(limitPrice);
      setIoc(false);
    }
  };

  return (
    <FloatingElement style={{ height: '100%', display: 'flex', flexDirection: 'column', ...style }}>
      <div>
        <Radio.Group
          onChange={(e) => setSide(e.target.value)}
          value={side}
          buttonStyle="solid"
          style={{
            marginBottom: 8,
            width: '100%',
          }}
        >
          <Radio.Button
            value="buy"
            style={{
              width: '50%',
              textAlign: 'center',
              color: side === 'buy' ? '#141026' : '',
              background: side === 'buy' ? '#AFD803' : '',
              borderColor: side === 'buy' ? '#AFD803' : '',
            }}
          >
            BUY
          </Radio.Button>
          <Radio.Button
            className="sell-button"
            value="sell"
            style={{
              width: '50%',
              textAlign: 'center',
              background: side === 'sell' ? '#E54033' : '',
              borderColor: side === 'sell' ? '#E54033' : '',
            }}
          >
            SELL
          </Radio.Button>
        </Radio.Group>
        <Input.Group compact style={{ paddingBottom: 8 }}>
          <Input
            style={{ width: 'calc(50% + 30px)', textAlign: 'right', paddingBottom: 8 }}
            addonBefore={<div style={{ width: '30px' }}>Price</div>}
            suffix={<span style={{ fontSize: 10, opacity: 0.5 }}>{quoteCurrency}</span>}
            value={price}
            type="number"
            step={market?.tickSize || 1}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            disabled={tradeType === 'Market'}
          />
          <Select
            style={{ width: 'calc(50% - 30px)' }}
            onChange={handleTradeTypeChange}
            value={tradeType}
          >
            <Select.Option value="Limit">Limit</Select.Option>
            <Select.Option value="Market">Market</Select.Option>
          </Select>
        </Input.Group>
        <Input.Group compact style={{ paddingBottom: 8 }}>
          <Input
            style={{ width: 'calc(50% + 30px)', textAlign: 'right' }}
            addonBefore={<div style={{ width: '30px' }}>Size</div>}
            suffix={<span style={{ fontSize: 10, opacity: 0.5 }}>{baseCurrency}</span>}
            value={baseSize}
            type="number"
            step={market?.minOrderSize || 1}
            onChange={(e) => onSetBaseSize(parseFloat(e.target.value))}
          />
          <Input
            style={{ width: 'calc(50% - 30px)', textAlign: 'right' }}
            suffix={<span style={{ fontSize: 10, opacity: 0.5 }}>{quoteCurrency}</span>}
            value={quoteSize}
            type="number"
            step={market?.minOrderSize || 1}
            onChange={(e) => onSetQuoteSize(parseFloat(e.target.value))}
          />
        </Input.Group>
        {/* {connected && marginInfo.prices.length ? (
          <Slider
            value={sizeFraction}
            onChange={onSliderChange}
            min={getSliderMin()}
            max={getSliderMax()}
            step={getSliderStep()}
            tooltipVisible={false}
          />
        ) : null} */}
        {tradeType !== 'Market' ? (
          <div style={{ paddingTop: 18 }}>
            {'POST '}
            <Switch
              checked={postOnly}
              onChange={postOnChange}
              style={{ marginRight: 40 }}
              disabled={tradeType === 'Market'}
            />
            {'IOC '}
            <Switch checked={ioc} onChange={iocOnChange} disabled={tradeType === 'Market'} />
          </div>
        ) : null}
      </div>
      {ipAllowed ? (
        side === 'buy' ? (
          <BuyButton
            disabled={(!price && tradeType === 'Limit') || !baseSize || !connected}
            onClick={onSubmit}
            block
            type="primary"
            size="large"
            loading={submitting}
          >
            {connected ? `Buy ${baseCurrency}` : 'CONNECT WALLET TO TRADE'}
          </BuyButton>
        ) : (
          <SellButton
            disabled={(!price && tradeType === 'Limit') || !baseSize || !connected}
            onClick={onSubmit}
            block
            type="primary"
            size="large"
            loading={submitting}
          >
            {connected ? `Sell ${baseCurrency}` : 'CONNECT WALLET TO TRADE'}
          </SellButton>
        )
      ) : (
        <Button
          size="large"
          style={{
            margin: '20px 0px 0px 0px',
          }}
          disabled
        >
          Country Not Allowed
        </Button>
      )}
    </FloatingElement>
  );
}
