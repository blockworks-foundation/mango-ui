import { Row, Popover, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import FloatingElement from '../../layout/FloatingElement';
// Styled antd components
import { RowBox, LeftCol, RightCol, BalanceCol } from '../componentStyles';
import { useMarginAccount } from '../../../utils/marginAccounts';
// Connection hook
import { useConnection } from '../../../utils/connection';
import { groupBy } from '../../../utils/utils';
import { useTradeHistory } from '../../../utils/useTradeHistory';
import { nativeToUi } from '@blockworks-foundation/mango-client/lib/utils';

const { Text } = Typography;

const calculatePNL = (tradeHistory, prices, mangoGroup) => {
  if (!tradeHistory.length) return '0.00';
  const profitAndLoss = {};
  const groupedTrades = groupBy(tradeHistory, (trade) => trade.marketName);
  if (!prices.length) return '-';

  const assetIndex = {
    'BTC/USDT': 0,
    'ETH/USDT': 1,
    USDT: 2,
  };

  groupedTrades.forEach((val, key, map) => {
    profitAndLoss[key] = val.reduce(
      (acc, current) => (current.side === 'sell' ? current.size * -1 : current.size) + acc,
      0,
    );
  });

  const totalNativeUsdt = tradeHistory.reduce((acc, current) => {
    const usdtAmount =
      current.side === 'sell'
        ? parseInt(current.nativeQuantityReleased)
        : parseInt(current.nativeQuantityPaid) * -1;

    return usdtAmount + acc;
  }, 0);

  profitAndLoss['USDT'] = nativeToUi(totalNativeUsdt, mangoGroup.mintDecimals[2]);

  let total = 0;
  for (const assetName in profitAndLoss) {
    total = total + profitAndLoss[assetName] * prices[assetIndex[assetName]];
  }

  return total.toFixed(2);
};

export default function MarginInfo() {
  // Connection hook
  const connection = useConnection();
  // Wallet hook
  // Get our account info
  const { marginAccount, mangoGroup } = useMarginAccount();
  // Working state
  // Hold the margin account info
  const [mAccountInfo, setMAccountInfo] = useState<
    { label: string; value: string; unit: string; desc: string; currency: string }[] | null
  >(null);
  const { tradeHistory } = useTradeHistory();

  // Settle bororows
  useEffect(() => {
    if (mangoGroup) {
      mangoGroup.getPrices(connection).then((prices) => {
        const collateralRatio = marginAccount
          ? marginAccount.getCollateralRatio(mangoGroup, prices)
          : 200;

        const accountEquity = marginAccount ? marginAccount.computeValue(mangoGroup, prices) : 0;
        let leverage;
        if (marginAccount) {
          leverage = accountEquity
            ? (1 / (marginAccount.getCollateralRatio(mangoGroup, prices) - 1)).toFixed(2)
            : '∞';
        } else {
          leverage = '0';
        }

        setMAccountInfo([
          {
            label: 'Equity',
            value: accountEquity.toFixed(2),
            unit: '',
            currency: '$',
            desc: 'The value of the account',
          },
          {
            label: 'Leverage',
            value: leverage,
            unit: 'x',
            currency: '',
            desc: 'Total position size divided by account value',
          },
          {
            label: 'Total PNL',
            value: calculatePNL(tradeHistory, prices, mangoGroup),
            unit: '',
            currency: '$',
            desc:
              'Total PNL reflects trades placed after March 15th 2021 04:00 AM UTC. Visit the Learn link in the top menu for more information.',
          },
          {
            // TODO: Get collaterization ratio
            label: 'Collateral Ratio',
            value: collateralRatio > 2 ? '>200' : (100 * collateralRatio).toFixed(0),
            unit: '%',
            currency: '',
            desc: 'The current collateral ratio',
          },
          {
            label: 'Maint. Collateral Ratio',
            value: (mangoGroup.maintCollRatio * 100).toFixed(0),
            unit: '%',
            currency: '',
            desc: 'The collateral ratio you must maintain to not get liquidated',
          },
          {
            label: 'Initial Collateral Ratio',
            value: (mangoGroup.initCollRatio * 100).toFixed(0),
            currency: '',
            unit: '%',
            desc: 'The collateral ratio required to open a new margin position',
          },
        ]);
      });
    }
  }, [marginAccount, mangoGroup]);
  return (
    <FloatingElement style={{ flex: 1 }}>
      <React.Fragment>
        {mAccountInfo ? (
          mAccountInfo.map((entry, i) => (
            <Row key={i} justify="space-between" style={{ padding: '4px' }}>
              <Popover content={entry.desc} placement="topLeft" trigger="hover">
                <LeftCol span={6}>
                  <Text ellipsis={true} style={{ cursor: 'help' }}>
                    {entry.label}
                  </Text>
                </LeftCol>
              </Popover>
              <RightCol span={8}>
                <Text strong>
                  {entry.currency + entry.value}
                  {entry.unit}
                </Text>
              </RightCol>
            </Row>
          ))
        ) : (
          <RowBox justify="center" align="middle">
            <BalanceCol></BalanceCol>
          </RowBox>
        )}
      </React.Fragment>
    </FloatingElement>
  );
}
