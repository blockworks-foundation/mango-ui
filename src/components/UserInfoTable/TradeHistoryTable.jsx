import React from 'react';
import { Row, Col, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import DataTable from '../layout/DataTable';
import { useTradeHistory } from '../../utils/useTradeHistory';

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
