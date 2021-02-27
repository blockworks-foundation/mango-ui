// For the dialog box component
import React, { useMemo, useEffect } from 'react';
import { Typography, Select } from 'antd';
// Mango group token account hook
import useMangoTokenAccount from '../../../utils/mangoTokenAccounts';
// TYpe annotation
import { TokenAccount } from '../../../utils/types';

const { Option } = Select;
const { Text } = Typography;

/**
 *
 * @param accounts The list of margin accounts for this user
 */

const AccountSelector = ({ currency, customTokenAccounts, setTokenAccount, tokenAccount }) => {
  // Get the mangoGroup token account
  const { mangoGroupTokenAccounts, tokenAccountsMapping } = useMangoTokenAccount();

  const tokenAccounts = useMemo(() => {
    return customTokenAccounts.SRM ? customTokenAccounts : mangoGroupTokenAccounts;
  }, [customTokenAccounts]);

  const options = useMemo(() => {
    // @ts-ignore
    return tokenAccounts[currency] && tokenAccounts[currency].length > 0 ? (
      tokenAccounts[currency].map((account: TokenAccount, i: number) => (
        <Option key={i} value={account.pubkey.toString()}>
          <Text code>
            {account.pubkey.toString().substr(0, 9) + '...' + account.pubkey.toString().substr(-9)}
          </Text>
        </Option>
      ))
    ) : (
      <Option
        value="No Token Account"
        key=""
        disabled={true}
        style={{
          // @ts-ignore
          backgroundColor: 'rgb(39, 44, 61)',
        }}
      >
        <Text keyboard type="warning">
          No Account
        </Text>
      </Option>
    );
  }, [currency, tokenAccounts]);

  useEffect(() => {
    if (currency === 'SRM') return;
    // Set the first account for the token
    if (tokenAccounts[currency] && tokenAccounts[currency].length > 0) {
      // Set the account with highest balance
      let hAccount: TokenAccount = tokenAccounts[currency][0];
      tokenAccounts[currency].forEach((account: TokenAccount, i: number) => {
        if (i === 0) {
          return;
        } else if (!tokenAccountsMapping.current[account.pubkey.toString()]) {
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
  });

  const handleChange = (e) => {
    if (currency === 'SRM') {
      setTokenAccount(tokenAccounts[currency].find((acct) => acct.pubkey.toString() === e));
    } else {
      setTokenAccount(tokenAccountsMapping.current[e].account);
    }
  };

  return (
    <div style={{ display: 'grid', justifyContent: 'center' }}>
      <Select
        size="middle"
        listHeight={150}
        style={{ width: '200px' }}
        placeholder={'Select an account'}
        value={tokenAccount ? tokenAccount.pubkey.toString() : undefined}
        // @ts-ignore
        onChange={handleChange}
      >
        {options}
      </Select>
    </div>
  );
};

export default AccountSelector;
