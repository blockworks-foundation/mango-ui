// For the deposit component
import React, { useMemo } from "react";
import { Card, Select } from "antd";
import { NumericInput } from "../NumericInput";
import "./styles.less";
// Parse the token account info
import { parseTokenAccountData } from '../../../utils/tokens';
// Type declarations
import { TokenAccount } from "../../../utils/types";

const { Option } = Select;

export const CurrencyInput = React.forwardRef((props: {
  currencies: Array<string>, // The mango group currencies
  setCurrency: (value: string) => void,
  currency: string,
  tokenAccount: TokenAccount | null, // Currently selected token account
  mintDecimals: Array<number>, // Decimals for the tokens
}, ref: any) => {
  const { currencies, currency, mintDecimals, setCurrency, tokenAccount } = props;
  // Let's create a memoized select and options for each mango group currency
  const createCurrencyOptions = useMemo(() => {
    return (
      <Select
        size="large"
        style={{ minWidth: 150 }}
        value={currency}
        onChange={(value) => {
          setCurrency(value)
        }}
      >
        {
          currencies.map((currency: string, i: number) => {
            return (
              <Option
                key={i}
                value={currency}
                name={currency}
                title={currency}
              >{currency}</Option>
            );
          })
        }
      </Select>
    );
  }, [currencies, currency, setCurrency])

  // Create a memoized currency input
  const NumInput = useMemo(() =>
    <NumericInput
      style={{
        fontSize: 20,
        boxShadow: "none",
        borderColor: "transparent",
        outline: "transpaernt",
      }}
      placeholder="0.00"
      ref={ref}
    />, [ref]);

  const userUiBalance = (): string => {
    if (tokenAccount && tokenAccount.account) {
      // Get the decimal for the mint
      return (parseTokenAccountData(tokenAccount.account.data).amount / Math.pow(10, mintDecimals[currencies.indexOf(currency)])).toFixed(3);
    }
    return '0';
  };

  return (
    <Card
      className="ccy-input"
      style={{ borderRadius: 20 }}
      bodyStyle={{ padding: 0 }}
    >
      <div className="ccy-input-header">
        <div className="ccy-input-header-left">Amount</div>
        <div
          className="ccy-input-header-right"
        >
          Balance: {userUiBalance()}
        </div>
      </div>
      <div className="ccy-input-header" style={{ padding: "0px 10px 5px 7px" }}>
        {NumInput}
        <div className="ccy-input-header-right" style={{ display: "felx" }}>
          {createCurrencyOptions}
        </div>
      </div>
    </Card>
  );
});
