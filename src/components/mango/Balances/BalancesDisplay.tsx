import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Col, Typography, Row, Select, Divider, Skeleton } from 'antd';
import { RowBox, SizeTitle, BalanceCol, ActionButton } from '../componentStyles';
import FloatingElement from '../../layout/FloatingElement';
// Let's get our account context
import { tokenPrecision, useMarginAccount } from '../../../utils/marginAccounts';
// Type annotaions
import { MarginAccount } from '@blockworks-foundation/mango-client';
import { PublicKey } from '@solana/web3.js';
// Let's import our Deposit component
import Deposit from '../Deposit';
// Connection hook
import { useWallet } from '../../../utils/wallet';
import { formatBalanceDisplay } from '../../../utils/utils';

const { Option } = Select;
const { Text } = Typography;

export default function BalancesDisplay({ style }: { style?: any }) {
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
    setSize,
  } = useMarginAccount();
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
  console.log('mango Group', mangoGroup);

  return (
    <FloatingElement style={{ flex: 0.5, padding: 10, ...style }}>
      <React.Fragment>
        <Divider>Margin Account</Divider>
        {marginAccounts.length > 1 && MAccountSelector}
        <SizeTitle>
          <BalanceCol span={6}>Assets</BalanceCol>
          <BalanceCol span={5}>Deposits</BalanceCol>
          <BalanceCol span={5}>Borrows</BalanceCol>
          <BalanceCol span={8}>Interest</BalanceCol>
        </SizeTitle>
        {mangoGroup ? (
          mango_groups.map((token, i) => {
            let depo = marginAccount ? marginAccount.getUiDeposit(mangoGroup, i) : 0;
            let borr = marginAccount ? marginAccount.getUiBorrow(mangoGroup, i) : 0;
            console.log('depo/borr', depo, borr);

            return (
              <Row key={i} style={{ marginBottom: 10 }}>
                <Col span={6}>
                  <img
                    alt=""
                    width="20"
                    height="20"
                    src={require(`../../../assets/icons/${token.toLowerCase()}.svg`)}
                    style={{
                      marginRight: 5,
                    }}
                  />
                  <Text type="secondary" ellipsis={true}>
                    {token}
                  </Text>
                </Col>
                <BalanceCol
                  span={5}
                  onClick={() =>
                    setSize(
                      depo === 0 ? { currency: '', size: 0 } : { currency: token, size: depo },
                    )
                  }
                  style={{ cursor: 'pointer' }}
                >
                  {maPending.sma ? (
                    <Skeleton.Input
                      active
                      size="small"
                      style={{
                        width: 50,
                        height: 4,
                        background:
                          'linear-gradient(90deg, #f4952c 25%, rgb(229 65 51) 37%, #f4952c 63%)',
                        backgroundSize: '400% 100%',
                        float: 'right',
                      }}
                    />
                  ) : (
                    formatBalanceDisplay(depo, tokenPrecision[token]).toFixed(tokenPrecision[token])
                  )}
                </BalanceCol>
                <BalanceCol span={5}>
                  {maPending.sma ? (
                    <Skeleton.Input
                      active
                      size="small"
                      style={{
                        width: 50,
                        height: 4,
                        background:
                          'linear-gradient(90deg, #f4952c 25%, rgb(229 65 51) 37%, #f4952c 63%)',
                        backgroundSize: '400% 100%',
                        float: 'right',
                      }}
                    />
                  ) : (
                    borr.toFixed(tokenPrecision[token])
                  )}
                </BalanceCol>
                <BalanceCol span={8}>
                  <Text strong style={{ color: '#AFD803' }}>
                    +{(mangoGroup.getDepositRate(i) * 100).toFixed(2)}%
                  </Text>
                  <Text>{'  /  '}</Text>
                  <Text strong style={{ color: '#E54033' }}>
                    -{(mangoGroup.getBorrowRate(i) * 100).toFixed(2)}%
                  </Text>
                </BalanceCol>
              </Row>
            );
          })
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
        <Row align="middle" justify="center">
          <Typography>
            <Typography.Paragraph
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 4px 0' }}
            >
              Settle funds in the Balances tab
            </Typography.Paragraph>
          </Typography>
        </Row>
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
