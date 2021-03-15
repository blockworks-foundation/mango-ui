import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Row, Col, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ActionButton } from '../mango/componentStyles';
import DataTable from '../layout/DataTable';
import { useMarginAccount } from '../../utils/marginAccounts';
import { useFills } from '../../utils/markets';

const byTimestamp = (a, b) => {
  return new Date(b.loadTimestamp) - new Date(a.loadTimestamp);
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

const useTradeHistory = () => {
  const eventQueueFills = useFills(1000);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [loadingHistory, setloadingHistory] = useState(false);
  const previousEventQueueFills = usePrevious(eventQueueFills);
  const { marginAccount } = useMarginAccount();

  const fetchTradeHistory = useCallback(async () => {
    setloadingHistory(true);
    const publicKeys = marginAccount.openOrdersAccounts.map((act) => act.publicKey.toString());
    const results = await Promise.all(
      publicKeys.map(async (pk) => {
        const response = await fetch(
          `https://stark-fjord-45757.herokuapp.com/trades/open_orders/${pk.toString()}`,
        );

        const parsedResponse = await response.json();
        return parsedResponse.data;
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

export default function TradeHistoryTable() {
  const { loadingHistory, tradeHistory, fetchTradeHistory } = useTradeHistory();

  const columns = [
    {
      title: 'Market',
      dataIndex: 'marketName',
      key: 'marketName',
    },
    {
      title: 'Side',
      dataIndex: 'side',
      key: 'side',
      render: (side) => (
        <Tag color={side === 'buy' ? '#41C77A' : '#F23B69'} style={{ fontWeight: 700 }}>
          {side.charAt(0).toUpperCase() + side.slice(1)}
        </Tag>
      ),
    },
    {
      title: `Size`,
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: `Price`,
      dataIndex: 'price',
      key: 'price',
    },
    {
      title: `Liquidity`,
      dataIndex: 'liquidity',
      key: 'liquidity',
    },
    {
      title: 'Fees',
      dataIndex: 'feeCost',
      key: 'feeCost',
    },
  ];

  return (
    <>
      <Row>
        <Col span={24}>
          <DataTable
            dataSource={tradeHistory}
            columns={columns}
            pagination={true}
            pageSize={5}
            emptyLabel={
              tradeHistory.length === 0 && !loadingHistory ? (
                'No trade history'
              ) : (
                <ReloadOutlined spin={loadingHistory} />
              )
            }
          />
          {tradeHistory.length > 0 ? (
            <div style={{ position: 'absolute', bottom: 0, left: 0 }}>
              <Typography>
                <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <em>Reflects trades placed after March 15th 04:00am UTC</em>
                </Typography.Paragraph>
              </Typography>
            </div>
          ) : null}
        </Col>
      </Row>
    </>
  );
}
