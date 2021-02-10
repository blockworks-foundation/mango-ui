import { Button, Col, Divider, Row } from 'antd';
import React, { useMemo } from 'react';
import FloatingElement from '../layout/FloatingElement';
import styled from 'styled-components';
// Let's get our account context
import { useMarginAccount } from '../../utils/marginAccounts';
// Spinner while we work on things
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

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

export default function BalancesDisplay() {
  const { marginAccount, mangoGroup, mango_groups, maPending } = useMarginAccount();
  // Let's memoise the current balance screen to prevent too much re-renders
  const tokenBalance = useMemo(() => {
    return (marginAccount && mangoGroup) ? mango_groups.split('_').map((entry, i) => (
      <Row key={i}>
        <BalanceCol span={8}>{entry}</BalanceCol>
        <BalanceCol span={8}>{marginAccount.getUiDeposit(mangoGroup, i)}</BalanceCol>
        <InterestCol span={8}>{mangoGroup.getDepositRate(i)}%</InterestCol>
      </Row>
    )) :
      <div style={{ textAlign: 'center' }}>
        <p>No data For Current Account</p>
      </div>
  }, [mangoGroup, marginAccount])
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
          {maPending.sma ?
            <div style={{ display: 'grid', justifyContent: 'center' }}>
              <Spin indicator={antIcon} />

            </div>
            : tokenBalance}
        </ScrollBox>
        <RowBox align="middle" justify="space-around">
          <Col style={{ width: 150 }}>
            <ActionButton block size="large" onClick={() => console.log('deposit')}
            >
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
