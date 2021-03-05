import React, { useEffect } from 'react';
import { Modal, Col, Select, Typography, Input, Card } from 'antd';
// Styled components
import { RowBox, ActionButton } from '../componentStyles';
import { nativeToUi } from '@blockworks-foundation/mango-client/lib/utils';
import { SRM_DECIMALS } from '@project-serum/serum/lib/token-instructions';

const formStateReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_AMOUNT':
      return { ...state, amount: action.value };
    case 'UPDATE_CURRENCY':
      return { ...state, selectedCurrency: action.value };
    case 'UPDATE_ACCOUNT':
      return { ...state, selectedAccount: action.value };
    default:
      return state;
  }
};

const findAccount = (accounts, publicKey, accessor) => {
  return accounts.find((acct) => acct[accessor].toString() === publicKey);
};

// For the modal when a user wants to deposit
const CustomDepositModal = React.forwardRef(
  (
    props: {
      balance: number | undefined;
      accounts: Array<any>;
      visible: boolean;
      loading: boolean;
      operation: string;
      onCancel: () => void;
      currency: string;
      currencies: Array<string>;
      handleSubmit: (x) => void;
    },
    ref: any,
  ) => {
    const {
      balance,
      accounts,
      onCancel,
      visible,
      currency,
      currencies,
      operation,
      handleSubmit,
      loading,
    } = props;
    const publicKeyAccessor = operation === 'Deposit' ? 'pubkey' : 'pubkey';

    useEffect(() => {
      dispatch({ type: 'UPDATE_AMOUNT', value: '' });
    }, [visible]);

    useEffect(() => {
      if (accounts.length) {
        const highestAcct = accounts.reduce((prev, next) => {
          return prev.amount > next.amount ? prev : next;
        });

        dispatch({ type: 'UPDATE_ACCOUNT', value: highestAcct[publicKeyAccessor].toString() });
      }
    }, [accounts]);

    const [formState, dispatch] = React.useReducer(formStateReducer, {
      selectedCurrency: currency ?? currencies[0],
      amount: '',
      selectedAccount: '',
    });

    const handleTextInput = (e) => {
      const { value } = e.target;
      const reg = /^-?\d*(\.\d*)?$/;

      if (reg.test(value) || value === '' || value === '-') {
        dispatch({ type: 'UPDATE_AMOUNT', value });
      }
    };

    const selectedAccount = findAccount(accounts, formState.selectedAccount, publicKeyAccessor);

    const displayBalance = () => {
      if (operation === 'Withdraw' && balance) {
        return nativeToUi(balance, SRM_DECIMALS);
      } else if (operation === 'Deposit') {
        return selectedAccount?.amount ? nativeToUi(selectedAccount.amount, SRM_DECIMALS) : 0;
      } else {
        return 0.0;
      }
    };

    return (
      <Modal
        title={
          <div style={{ display: 'grid', justifyContent: 'center' }}>
            <Select
              size="middle"
              listHeight={150}
              style={{ width: '200px' }}
              placeholder={'Select an account'}
              value={formState.selectedAccount}
              onChange={(value) => dispatch({ type: 'UPDATE_ACCOUNT', value })}
            >
              {accounts.map((acct, i) => (
                <Select.Option key={i} value={acct[publicKeyAccessor].toString()}>
                  <Typography.Text code>
                    {acct[publicKeyAccessor].toString().substr(0, 9) +
                      '...' +
                      acct[publicKeyAccessor].toString().substr(-9)}
                  </Typography.Text>
                </Select.Option>
              ))}
              {accounts.length ? null : (
                <Select.Option
                  value="No Token Account"
                  key=""
                  disabled={true}
                  style={{ backgroundColor: 'rgb(39, 44, 61)' }}
                >
                  <Typography.Text keyboard type="warning">
                    No Account
                  </Typography.Text>
                </Select.Option>
              )}
            </Select>
          </div>
        }
        onCancel={onCancel}
        visible={visible}
        footer={null}
      >
        <Card className="ccy-input" style={{ borderRadius: 20 }} bodyStyle={{ padding: 0 }}>
          <div className="ccy-input-header">
            <div className="ccy-input-header-left">Amount</div>
            <div className="ccy-input-header-right">Balance: {displayBalance()}</div>
          </div>
          <div className="ccy-input-header" style={{ padding: '0px 10px 5px 7px' }}>
            <Input
              style={{
                fontSize: 20,
                boxShadow: 'none',
                borderColor: 'transparent',
                outline: 'transpaernt',
              }}
              placeholder="0.00"
              ref={ref}
              value={formState.amount}
              onChange={handleTextInput}
              maxLength={25}
            />
            <div className="ccy-input-header-right" style={{ display: 'felx' }}>
              <Select
                size="large"
                style={{ minWidth: 150 }}
                value={formState.selectedCurrency}
                onChange={(e) => dispatch({ type: 'UPDATE_CURRENCY', value: e.target.value })}
              >
                {currencies.map((currency: string, i: number) => {
                  return (
                    <Select.Option key={i} value={currency} name={currency} title={currency}>
                      <img
                        alt=""
                        width="20"
                        height="20"
                        src={require(`../../../assets/icons/${currency.toLowerCase()}.svg`)}
                        style={{
                          marginRight: 5,
                          alignSelf: 'center',
                        }}
                      />
                      {currency}
                    </Select.Option>
                  );
                })}
              </Select>
            </div>
          </div>
        </Card>
        <RowBox align="middle" justify="center">
          <Col span={8}>
            <ActionButton
              block
              size="middle"
              onClick={() => handleSubmit(formState)}
              loading={loading}
            >
              {operation}
            </ActionButton>
          </Col>
        </RowBox>
      </Modal>
    );
  },
);

export default CustomDepositModal;
