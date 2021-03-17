import { Button, Input, Radio, Switch, Select } from 'antd';
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { PublicKey } from '@solana/web3.js';
import { IDS } from '@blockworks-foundation/mango-client';
import {
  useSelectedBaseCurrencyBalances,
  useSelectedQuoteCurrencyBalances,
  useMarket,
  useMarkPrice,
  useOrderbook,
  useSelectedOpenOrdersAccount,
  useSelectedBaseCurrencyAccount,
  useSelectedQuoteCurrencyAccount,
  useFeeDiscountKeys,
  useLocallyStoredFeeDiscountKey,
} from '../utils/markets';
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

// const sliderMarks = {
//   0: '0%',
//   25: '25%',
//   50: '50%',
//   75: '75%',
//   100: '100%',
// };

export default function TradeForm({
  style,
  setChangeOrderRef,
}: {
  style?: any;
  setChangeOrderRef?: (ref: ({ size, price }: { size?: number; price?: number }) => void) => void;
}) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const { address, baseCurrency, quoteCurrency, market } = useMarket();
  const baseCurrencyBalances = useSelectedBaseCurrencyBalances();
  const quoteCurrencyBalances = useSelectedQuoteCurrencyBalances();
  const baseCurrencyAccount = useSelectedBaseCurrencyAccount();
  const quoteCurrencyAccount = useSelectedQuoteCurrencyAccount();
  const openOrdersAccount = useSelectedOpenOrdersAccount(true);
  const { wallet, connected } = useWallet();
  const sendConnection = useSendConnection();

  const connection = useConnection();
  const { endpointInfo } = useConnectionConfig();
  const { marginAccount, mangoGroup, size } = useMarginAccount();
  const markPrice = useMarkPrice();
  const [orderbook] = useOrderbook();

  useFeeDiscountKeys();
  const { storedFeeDiscountKey: feeDiscountKey } = useLocallyStoredFeeDiscountKey();
  const { ipAllowed } = useIpAddress();

  const [postOnly, setPostOnly] = useState(false);
  const [ioc, setIoc] = useState(false);
  const [baseSize, setBaseSize] = useState<number | undefined>(undefined);
  const [quoteSize, setQuoteSize] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [sizeFraction, setSizeFraction] = useState(0);
  const [tradeType, setTradeType] = useState('Limit');

  const availableQuote =
    openOrdersAccount && market ? market.quoteSplSizeToNumber(openOrdersAccount.quoteTokenFree) : 0;

  let quoteBalance = (quoteCurrencyBalances || 0) + (availableQuote || 0);
  let baseBalance = baseCurrencyBalances || 0;
  let sizeDecimalCount = market?.minOrderSize && getDecimalCount(market.minOrderSize);
  let priceDecimalCount = market?.tickSize && getDecimalCount(market.tickSize);

  useEffect(() => {
    setChangeOrderRef && setChangeOrderRef(doChangeOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setChangeOrderRef]);

  useEffect(() => {
    baseSize && price && onSliderChange(sizeFraction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side]);

  useEffect(() => {
    updateSizeFraction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, baseSize]);

  // Set the price from the balance comp
  useEffect(() => {
    if (size.currency) {
      if (size.currency === baseCurrency) {
        onSetBaseSize(size.size);
      } else {
        onSetQuoteSize(size.size);
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
        await market?.findBestFeeDiscountKey(sendConnection, wallet.publicKey);
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

  const updateSizeFraction = () => {
    const rawMaxSize = side === 'buy' ? quoteBalance / (price || markPrice || 1) : baseBalance;
    const maxSize = floorToDecimal(rawMaxSize, sizeDecimalCount);
    const sizeFraction = Math.min(((baseSize || 0) / maxSize) * 100, 100);
    setSizeFraction(sizeFraction);
  };

  const onSliderChange = (value) => {
    if (!price && markPrice) {
      let formattedMarkPrice: number | string = priceDecimalCount
        ? markPrice.toFixed(priceDecimalCount)
        : markPrice;
      setPrice(
        typeof formattedMarkPrice === 'number'
          ? formattedMarkPrice
          : parseFloat(formattedMarkPrice),
      );
    }

    let newSize;
    if (side === 'buy') {
      if (price || markPrice) {
        newSize = ((quoteBalance / (price || markPrice || 1)) * value) / 100;
      }
    } else {
      newSize = (baseBalance * value) / 100;
    }

    // round down to minOrderSize increment
    let formatted = floorToDecimal(newSize, sizeDecimalCount);

    onSetBaseSize(formatted);
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

    const calculateMarketPrice = (orderBook) => {
      let acc = 0;
      let selectedOrder;
      for (let order of orderBook) {
        acc += order[1];
        if (acc >= size.size) {
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

    try {
      let calculatedPrice;
      if (tradeType === 'Market') {
        calculatedPrice =
          side === 'buy'
            ? calculateMarketPrice(orderbook.asks)
            : calculateMarketPrice(orderbook.bids);
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
    setIoc(true);
    if (tradeType === 'Market') {
      setPrice(undefined);
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
        {/* <Slider
          value={sizeFraction}
          tipFormatter={(value) => `${value}%`}
          marks={sliderMarks}
          onChange={onSliderChange}
        /> */}
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
      </div>
      {ipAllowed ? (
        side === 'buy' ? (
          <BuyButton
            disabled={(!price && tradeType === 'Limit') || !baseSize}
            onClick={onSubmit}
            block
            type="primary"
            size="large"
            loading={submitting}
          >
            Buy {baseCurrency}
          </BuyButton>
        ) : (
          <SellButton
            disabled={(!price && tradeType === 'Limit') || !baseSize}
            onClick={onSubmit}
            block
            type="primary"
            size="large"
            loading={submitting}
          >
            Sell {baseCurrency}
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
