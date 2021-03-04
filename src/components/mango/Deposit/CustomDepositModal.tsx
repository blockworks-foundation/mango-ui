import React, { useEffect } from 'react';
import { Modal, Col, Select, Typography, Input, Card } from 'antd';
// Styled components
import { RowBox, ActionButton } from '../componentStyles';

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

// For the modal when a user wants to deposit
const CustomDepositModal = React.forwardRef(
  (
    props: {
      accounts: Array<any>;
      balance: number;
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
      accounts,
      balance,
      onCancel,
      visible,
      currency,
      currencies,
      operation,
      handleSubmit,
      loading,
    } = props;

    useEffect(() => {
      dispatch({ type: 'UPDATE_AMOUNT', value: '' });
    }, [visible]);

    useEffect(() => {
      if (accounts.length) {
        console.log('accounts', accounts);

        const highestAcct = accounts.reduce((prev, next) => {
          return prev.amount > next.amount ? prev : next;
        });

        dispatch({ type: 'UPDATE_ACCOUNT', value: highestAcct.pubkey.toString() });
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
      console.log('value', value);

      if (reg.test(value) || value === '' || value === '-') {
        dispatch({ type: 'UPDATE_AMOUNT', value });
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
                <Select.Option key={i} value={acct.pubkey.toString()}>
                  <Typography.Text code>
                    {acct.pubkey.toString().substr(0, 9) +
                      '...' +
                      acct.pubkey.toString().substr(-9)}
                  </Typography.Text>
                </Select.Option>
              ))}
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
            <div className="ccy-input-header-right">Balance: {balance}</div>
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
