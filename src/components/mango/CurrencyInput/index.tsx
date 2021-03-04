// For the deposit component
import React, { useMemo } from 'react';
import { Card, Select } from 'antd';
import { NumericInput } from '../NumericInput';
import './styles.less';
import useMangoTokenAccount from '../../../utils/mangoTokenAccounts';
import { TokenAccount } from '../../../utils/types';
const { Option } = Select;

export const CurrencyInput = React.forwardRef(
  (
    props: {
      currencies: Array<string>; // The mango group currencies
      setCurrency: (value: string) => void;
      currency: string;
      userUiBalance: () => void; // The token balance of the user
      setTokenAccount: any;
    },
    ref: any,
  ) => {
    const { currencies, currency, setCurrency, userUiBalance, setTokenAccount } = props;
    const { mangoGroupTokenAccounts, tokenAccountsMapping } = useMangoTokenAccount();

    const handleCurrencyChange = (value) => {
      if (value === 'SRM') return;
      // Set the first account for the token
      if (mangoGroupTokenAccounts[value] && mangoGroupTokenAccounts[value].length > 0) {
        // Set the account with highest balance
        let hAccount: TokenAccount = mangoGroupTokenAccounts[value][0];
        mangoGroupTokenAccounts[value].forEach((account: TokenAccount, i: number) => {
          if (i === 0 || !tokenAccountsMapping.current[account.pubkey.toString()]) {
            return;
          }
          hAccount =
            tokenAccountsMapping.current[account.pubkey.toString()].balance >
            tokenAccountsMapping.current[hAccount.pubkey.toString()].balance
              ? tokenAccountsMapping.current[account.pubkey.toString()].account
              : hAccount;
        });

        setTokenAccount(hAccount);
      } else {
        setTokenAccount(null);
      }
      setCurrency(value);
    };

    // Let's create a memoized select and options for each mango group currency
    const createCurrencyOptions = useMemo(() => {
      return (
        <Select
          size="large"
          style={{ minWidth: 150 }}
          value={currency}
          onChange={handleCurrencyChange}
        >
          {currencies.map((currency: string, i: number) => {
            return (
              <Option key={i} value={currency} name={currency} title={currency}>
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
              </Option>
            );
          })}
        </Select>
      );
    }, [currencies, currency, setCurrency]);

    // Create a memoized currency input
    const NumInput = useMemo(
      () => (
        <NumericInput
          style={{
            fontSize: 20,
            boxShadow: 'none',
            borderColor: 'transparent',
            outline: 'transpaernt',
          }}
          placeholder="0.00"
          ref={ref}
        />
      ),
      [ref],
    );

    return (
      <Card className="ccy-input" style={{ borderRadius: 20 }} bodyStyle={{ padding: 0 }}>
        <div className="ccy-input-header">
          <div className="ccy-input-header-left">Amount</div>
          <div className="ccy-input-header-right">Balance: {userUiBalance()}</div>
        </div>
        <div className="ccy-input-header" style={{ padding: '0px 10px 5px 7px' }}>
          {NumInput}
          <div className="ccy-input-header-right" style={{ display: 'felx' }}>
            {createCurrencyOptions}
          </div>
        </div>
      </Card>
    );
  },
);
