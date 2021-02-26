import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Col, Typography, Row, Select, Spin, Divider } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { RowBox, SizeTitle, BalanceCol, ActionButton } from '../componentStyles';
import FloatingElement from '../../layout/FloatingElement';
// Import token info
import useTokenInfo from '../../../utils/tokenInfo';
// Let's get our account context
import { tokenPrecision, useMarginAccount } from '../../../utils/marginAccounts';
// Type annotaions
import { MarginAccount } from '@mango/client';
import { PublicKey } from '@solana/web3.js';
// Let's import our Deposit component
import Deposit from '../Deposit';
// Connection hook
import { useWallet } from '../../../utils/wallet';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

const { Option } = Select;
const { Text } = Typography;

export default function BalancesDisplay() {
  // Connection hook
  const { connected } = useWallet();
  const {
    marginAccount,
    marginAccounts,
    keyMappings,
    mangoGroup,
    maPending,
    mango_groups,
    setMarginAccount,
  } = useMarginAccount();
  // Get token info
  const { tokenMap } = useTokenInfo();
  // Show or hide the deposit component
  const [showDeposit, setShowDeposit] = useState<boolean>(false);
  // What opration user wants to perform (withdraw or deposit)
  const operation = useRef('deposit');
  // Show the deposit modal
  const showModalDeposit = useCallback(() => {
    // Set the operation
    operation.current = 'Deposit';
    setShowDeposit((showDeposit) => true);
  }, []);
  const showModalWithdraw = useCallback(() => {
    // Set the operation
    operation.current = 'Withdraw';
    setShowDeposit((showDeposit) => true);
  }, []);
  // Hide the modal
  const hideModal = useCallback(() => {
    setShowDeposit((showDeposit) => false);
  }, []);
  // Just some little optimization to disallow deposiModal re-render
  const DepositModal = useMemo(
    () => (
      <Deposit
        mango_groups={mango_groups}
        visible={showDeposit}
        operation={operation.current}
        onCancel={hideModal}
      />
    ),
    [mango_groups, showDeposit, hideModal],
  );

  // For the account selector. Don't re-render every time
  const MAccountSelector = useMemo(
    () => (
      <AccountSelector
        marginAccount={marginAccount}
        marginAccounts={marginAccounts}
        setMarginAccount={setMarginAccount}
        keyMappings={keyMappings}
      />
    ),
    [marginAccounts, marginAccount, keyMappings, setMarginAccount],
  );

  return (
    <FloatingElement style={{ flex: 0.5, paddingTop: 10, paddingRight: 1 }}>
      <React.Fragment>
        <Divider>Margin Account</Divider>
        {marginAccounts.length > 1 && MAccountSelector}
        <SizeTitle>
          <BalanceCol span={6}>Assets</BalanceCol>
          <BalanceCol span={5}>Deposits</BalanceCol>
          <BalanceCol span={5}>Borrows</BalanceCol>
          <BalanceCol span={8}>Interest</BalanceCol>
        </SizeTitle>
        {maPending.sma ? (
          <RowBox justify="space-around">
            <Spin indicator={antIcon} />
          </RowBox>
        ) : mangoGroup ? (
          mango_groups.map((token, i) => (
            <Row key={i}>
              <Col span={6}>
                <img
                  alt="Token icon"
                  width="20"
                  height="20"
                  src={tokenMap.get(mangoGroup.tokens[i].toString())?.icon}
                  style={{
                    marginBlock: 5,
                    marginRight: 5,
                  }}
                />
                <Text type="secondary">{token}</Text>
              </Col>
              <BalanceCol span={5}>
                {marginAccount
                  ? marginAccount.getUiDeposit(mangoGroup, i).toFixed(tokenPrecision[token])
                  : 0}
              </BalanceCol>
              <BalanceCol span={5}>
                {marginAccount
                  ? marginAccount.getUiBorrow(mangoGroup, i).toFixed(tokenPrecision[token])
                  : 0}
              </BalanceCol>
              <BalanceCol span={8}>
                <Text strong type="success">
                  +{(mangoGroup.getDepositRate(i) * 100).toFixed(2)}%
                </Text>
                <Text>{'  /  '}</Text>
                <Text strong type="danger">
                  -{(mangoGroup.getBorrowRate(i) * 100).toFixed(2)}%
                </Text>
              </BalanceCol>
            </Row>
          ))
        ) : (
          <Row align="middle" justify="center">
            <BalanceCol>
              <Text>
                No data For Current Account
                <br />
                (select a margin account)
              </Text>
            </BalanceCol>
          </Row>
        )}
        <RowBox align="middle" justify="space-around">
          <Col style={{ width: 120 }}>
            <ActionButton
              block
              size="middle"
              onClick={showModalDeposit}
              disabled={connected ? false : true}
            >
              Deposit
            </ActionButton>
          </Col>
          <Col style={{ width: 120 }}>
            <ActionButton
              block
              size="middle"
              disabled={marginAccount ? false : true}
              onClick={showModalWithdraw}
            >
              Withdraw
            </ActionButton>
          </Col>
        </RowBox>
        {showDeposit && DepositModal}
      </React.Fragment>
    </FloatingElement>
  );
}

/**
 *
 * @param accounts The list of margin accounts for this user
 */
// TODO: Get account object structure
// TODO: Use hooks to get current selected account
function AccountSelector({ keyMappings, marginAccounts, marginAccount, setMarginAccount }) {
  // Build a map of pubkeys to margin accounts
  const mapping: Map<PublicKey, MarginAccount> = keyMappings();
  const options = useMemo(() => {
    return marginAccounts.length > 0
      ? // @ts-ignore
        marginAccounts.map((marginAccount: MarginAccount, i: number) => (
          <Option key={i} value={marginAccount.publicKey.toString()}>
            <Text code>
              {marginAccount.publicKey.toString().substr(0, 9) +
                '...' +
                marginAccount.publicKey.toString().substr(-9)}
            </Text>
          </Option>
        ))
      : null;
  }, [marginAccounts]);

  return (
    <div style={{ display: 'grid', justifyContent: 'center' }}>
      <Select
        size="middle"
        placeholder={'Deposit to create an account'}
        value={marginAccount ? marginAccount.publicKey.toString() : undefined}
        listHeight={200}
        style={{ width: '230px' }}
        // @ts-ignore
        onChange={(e) => setMarginAccount(mapping.get(e))}
      >
        {options}
        <Option
          value={''}
          key=""
          style={{
            // @ts-ignore
            backgroundColor: 'rgb(39, 44, 61)',
          }}
        >
          <Text keyboard type="warning">
            Use New Margin Account
          </Text>
        </Option>
      </Select>
    </div>
  );
}
