import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Button, Col, Divider, Row, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons'
import { RowBox, SizeTitle, ScrollBox, BalanceCol, InterestCol, ActionButton } from '../componentStyles';
import FloatingElement from '../../layout/FloatingElement';
// Let's get our account context
import { useMarginAccount } from '../../../utils/marginAccounts';
// Let's import our Deposit component
import Deposit from '../Deposit';
import { useWallet } from '../../../utils/wallet';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

export default function BalancesDisplay() {
  const { marginAccount, mangoGroup, maPending, mango_groups, getMarginAccount } = useMarginAccount();
  // Show or hide the deposit component
  const [showDeposit, setShowDeposit] = useState<boolean>(false);
  // What opration user wants to perform (withdraw or deposit)
  const operation = useRef("deposit");
  // Save the interest rate
  const [depositRate, setDepositRate] = useState<{ token: number } | {}>({});
  // id for our interval object
  const intervalId = useRef<NodeJS.Timeout>();
  // Show the deposit modal
  const showModalDeposit = useCallback(() => {
    // Set the operation
    operation.current = "Deposit"
    setShowDeposit(showDeposit => true);
  }, [])
  const showModalWithdraw = useCallback(() => {
    // Set the operation
    operation.current = "Withdraw"
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
      operation={operation.current}
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
      // Get all margin accounts again
      getMarginAccount();
      // Trigger re-render
      setDepositRate(Math.random());
    }, 3000);
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
              <RowBox justify="space-around" >
                <Spin indicator={antIcon} />
              </RowBox>
              :
              (marginAccount && mangoGroup) ? mango_groups.map((token, i) => (
                <Row key={i}>
                  <BalanceCol span={8}>{token}</BalanceCol>
                  <BalanceCol span={8}>{marginAccount.getUiDeposit(mangoGroup, i)}</BalanceCol>
                  <InterestCol span={8}>{mangoGroup.getDepositRate(i)}%</InterestCol>
                </Row>
              )) :
                <div style={{ textAlign: 'center' }}>
                  <p>No data For Current    Account<br />
                  (select a margin account)
                  </p>
                </div>
          }
        </ScrollBox>
        <RowBox align="middle" justify="space-around">
          <Col style={{ width: 120 }}>
            <ActionButton block size="large"
              disabled={marginAccount ? false : true}
              onClick={showModalDeposit}
            >
              Deposit
            </ActionButton>
          </Col>
          <Col style={{ width: 120 }}>
            <ActionButton block size="large"
              disabled={marginAccount ? false : true}
              onClick={showModalWithdraw}>
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
  const { createMarginAccount } = useMarginAccount();
  // Check connection ot wallet
  const { connected } = useWallet();
  // And for creating a margin account
  const createAccount = () => {
    setPendingTrans(true);
    createMarginAccount().then(() => {
      setPendingTrans(false);
    }).catch((err) => {
      console.error(err);
      // TODO: Notify error
      setPendingTrans(false);
    })
  }
  return (
    <Button block size="middle"
      type="primary"
      style={{ width: "220px", float: 'right' }}
      onClick={createAccount}
      disabled={!connected ? true : false}
      loading={pendingTrans ? true : false}
    >
      {connected ? 'Create Margin Account' : 'Connect Wallet'}
    </Button>
  );
}
