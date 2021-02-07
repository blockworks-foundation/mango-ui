import { Button, Col, Divider, Row } from 'antd';
import React from 'react';
import FloatingElement from '../layout/FloatingElement';
import styled from 'styled-components';

const RowBox = styled(Row)`
  padding-top: 20px;
  padding-bottom: 20px;
`;

const SizeTitle = styled(Row)`
  padding: 20px 0 14px;
  color: #434a59;
`;

const ScrollBox = styled.div`
  max-height: 150px;
  overflow: auto;
`

const BalanceCol = styled(Col)`
  text-align: center;
`;

const InterestCol = styled(BalanceCol)`
  color: rgb(2, 191, 118);
`

/* const Tip = styled.p`
 *   font-size: 12px;
 *   padding-top: 6px;
 * `;
 *  */
const ActionButton = styled(Button)`
  color: #2abdd2;
  background-color: #212734;
  border-width: 0px;
`;

const mockData = [{
  asset: 'BTC',
  balance: (Math.random() * 100).toFixed(2),
  interest: (Math.random() * 100).toFixed(2),
}, {
  asset: 'ETH',
  balance: (Math.random() * 100).toFixed(2),
  interest: (Math.random() * 100).toFixed(2),
}, {
  asset: 'USDC',
  balance: (Math.random() * 100).toFixed(2),
  interest: (Math.random() * 100).toFixed(2),
}]

export default function BalancesDisplay() {
  return (
    <FloatingElement style={{ flex: 0.5, paddingTop: 10 }}>
      <React.Fragment>
        <Divider style={{ borderColor: 'white' }}>
          Balances
        </Divider>
        <SizeTitle>
          <BalanceCol span={8}>Assets</BalanceCol>
          <BalanceCol span={8}>Balance</BalanceCol>
          <BalanceCol span={8}>Interest</BalanceCol>
        </SizeTitle>
        <ScrollBox>
          {mockData.map((entry, i) => (
            <Row key={i}>
              <BalanceCol span={8}>{entry.asset}</BalanceCol>
              <BalanceCol span={8}>{entry.balance}</BalanceCol>
              <InterestCol span={8}>{entry.interest}%</InterestCol>
            </Row>
          ))}
        </ScrollBox>
        <RowBox align="middle" justify="space-around">
          <Col style={{ width: 150 }}>
            <ActionButton block size="large" onClick={() => console.log('deposit')}>
              Deposit
            </ActionButton>
          </Col>
          <Col style={{ width: 150 }}>
            <ActionButton block size="large" onClick={() => console.log('withdraw')}>
              Withdraw
            </ActionButton>
          </Col>
        </RowBox>
      </React.Fragment>
    </FloatingElement>
  );
}
