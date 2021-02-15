import React, { useMemo, useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Button, Col, Divider, Row } from 'antd';
import { RowBox, SizeTitle, ScrollBox, BalanceCol, InterestCol, ActionButton } from '../componentStyles';
import FloatingElement from '../../layout/FloatingElement';
// Let's get our account context
import { useMarginAccount } from '../../../utils/marginAccounts';
// Spinner while we work on things
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
// Let's import our Deposit component
import Deposit from '../Deposit';
import { useWallet } from '../../../utils/wallet';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

export default function BalancesDisplay() {
  const { marginAccount, mangoGroup, mango_groups, maPending } = useMarginAccount();
  // Show or hide the deposit component
  const [showDeposit, setShowDeposit] = useState<boolean>(false);
  // Save the interest rate
  const [depositRate, setDepositRate] = useState<{ token: number } | {}>({});
  // id for our interval object
  const intervalId = useRef<NodeJS.Timeout>()
  // Let's memoise the current balance screen to prevent too much re-renders
  const tokenBalance = useMemo(() => {
    return (marginAccount && mangoGroup) ? mango_groups.split('_').map((token, i) => (
      <Row key={i}>
        <BalanceCol span={8}>{token}</BalanceCol>
        <BalanceCol span={8}>{marginAccount.getUiDeposit(mangoGroup, i)}</BalanceCol>
        <InterestCol span={8}>{mangoGroup.getDepositRate(i)}%</InterestCol>
      </Row>
    )) :
      <div style={{ textAlign: 'center' }}>
        <p>No data For Current Account<br />
          (select a margin account)
          </p>
      </div>
  }, [marginAccount, depositRate, mango_groups, mangoGroup, marginAccount]);
  // Show the deposit modal
  const showModal = useCallback(() => {
    setShowDeposit(showDeposit => true);
  }, [])
  // Hide the modal
  const hideModal = useCallback(() => {
    setShowDeposit(showDeposit => false);
  }, [])
  // Just some little optimization to disallow deposiModal re-render
  const DepositModal = useMemo(() =>
    <Deposit
      mango_groups={mango_groups}
      visible={showDeposit}
      onCancel={hideModal}
    />
    , [mango_groups, showDeposit, hideModal])
  // This effect would create a timer to get the user's balance and interest rate for the selected margin account.
  // TODO: Find a beter impl like websocket
  useEffect(() => {
    // Get the balance and interest every 10s
    const id = setInterval(() => {
      // Check if margin account exist
      if (!marginAccount) {
        return;
      }
      // TODO: Which impl works better
      // let balances: { token: number } | {} = {}, depositRate: { token: number } | {} = {};
      // mango_groups.split('_').forEach((token, i) => {
      //   // @ts-ignore
      //   balances[token] = marginAccount.getUiDeposit(mangoGroup, i);
      //   // @ts-ignore
      //   depositRate[token] = mangoGroup.getDepositRate(i);
      // });
      // setMAPending(prev => { prev['sma'] = false; return prev; });
      // // set the balances and the interest
      // setBalances(balances);
      // setDepositRate(depositRate);
      setDepositRate(Math.random());
    }, 5000);
    intervalId.current = id;
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    }
  });

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
          {
            maPending.sma ?
              <RowBox align="middle" justify="center">
                <Spin indicator={antIcon} />
              </RowBox>
              :
              tokenBalance
          }
        </ScrollBox>
        <RowBox align="middle" justify="space-around">
          <Col style={{ width: 120 }}>
            <ActionButton block size="large"
              disabled={marginAccount ? false : true}
              onClick={showModal}
            >
              Deposit
            </ActionButton>
          </Col>
          <Col style={{ width: 120 }}>
            <ActionButton block size="large"
              disabled={marginAccount ? false : true}
              onClick={() => console.log('withdraw')}>
              Withdraw
            </ActionButton>
          </Col>
        </RowBox>
        {showDeposit && DepositModal}
      </React.Fragment>
    </FloatingElement>
  );
}

// Button for creating margin accounts
export const CreateMarginAccountButton = () => {
  // To know when a transaction is up
  const [pendingTrans, setPendingTrans] = useState(false);
  // Get the account hooks
  const { marginAccount, maPending, createMarginAccount } = useMarginAccount();
  // Check connection ot wallet
  const { connected } = useWallet();
  // And for creating a margin account
  const createAccount = () => {
    setPendingTrans(true);
    createMarginAccount();
    setPendingTrans(false);
  }
  return (
    <Button block size="middle"
      type="primary"
      style={{ width: "220px", float: 'right' }}
      onClick={createAccount}
      disabled={!connected || maPending.cma || maPending.sma ? true : false}
      loading={pendingTrans ? true : false}
    >
      {connected ? 'Create Margin Account' : 'Connect Wallet'}
    </Button>
  );
}
