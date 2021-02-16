// For the dialog box component
import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
// Get our currency input component
import { CurrencyInput } from '../CurrencyInput';
// Components from antd
import { Typography, Modal, Button, Col, Select } from 'antd';
// Styled components
import { RowBox } from '../componentStyles';
// Mango group token account hook
import useMangoTokenAccount from '../../../utils/mangoTokenAccounts';
// Mango margin account hook
import { useMarginAccount } from '../../../utils/marginAccounts';
// TYpe annotation
import { TokenAccount } from '../../../utils/types';
// Notifications
import { notify } from '../../../utils/notifications'
// Wallet and connection hooks
import { useConnection } from '../../../utils/connection';
import { useWallet } from '../../../utils/wallet';
// Parse the token account info
import { parseTokenAccountData } from '../../../utils/tokens';
// And now mango client library functions
import { deposit, withdraw } from '../../../utils/mango';

const { Option } = Select;
const { Text } = Typography;

const Deposit = (props: {
  mango_groups: string,
  visible: boolean,
  operation: string,
  onCancel: () => void,
}) => {
  // COnnection and wallet options
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  // Get the mango group and mango options
  const { marginAccount, mangoGroup, mango_groups, mango_options } = useMarginAccount();
  // The current mango group tokens
  const [currency, setCurrency] = useState<string>(mango_groups.split('_')[0]);
  // Set the current token account upon currency change
  // The current token account 
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | null>(null);
  // WOrking state
  const [working, setWorking] = useState(false);
  // Ref to get the underlying input box
  const inputRef = useRef(null);
  // How much does this token account have
  const userUiBalance = useCallback(() => {
    if (tokenAccount && tokenAccount.account) {
      // Get the decimal for the mint
      // @ts-ignore
      return (parseTokenAccountData(tokenAccount.account.data).amount / Math.pow(10, mangoGroup?.mintDecimals[mango_groups.split('_').indexOf(currency)])).toFixed(3);
    }
    return '0';
  }, [tokenAccount, currency, mangoGroup, mango_groups]);
  // When the user hits deposit
  const depositFunds = () => {
    if (!connected) {
      notify({
        message: 'Please Connect to wallet first',
        description: 'Wallet not connected. Hit the connect wallet button',
        type: 'info'
      });
      return;
    }
    // TODO: First check if the user has any enough balance
    // @ts-ignore
    else if (!inputRef || !inputRef.current || !inputRef.current.state.value || Number(inputRef.current.state.value) <= 0) {
      notify({
        message: 'Please Input Amount',
        description: 'No amount to deposit inputed',
        type: 'error'
      });
      return;
      // @ts-ignore
    } else if (Number(inputRef.current.state.value) > Number(userUiBalance())) {
      notify({
        message: 'Not enough funds',
        description: 'Please Input Amount less than your balance',
        type: 'error'
      });
      return;
    } else if (!marginAccount || !mangoGroup) {
      notify({
        message: 'Please select a margin account',
        description: 'Select a margin acount from the margin account info component below',
        type: 'error'
      });
      return;
    } else if (!tokenAccount) {
      // TODO: Create token account for user
      notify({
        message: 'Please select a token Account',
        description: 'Select a token acount above',
        type: 'error'
      });
      return;
    }
    // We are working
    setWorking(true);
    // Call the deposit function of mangoCLIENT
    // Check if er are depositing or withdrawing
    if (props.operation === 'Withdraw') {
      // @ts-ignore
      withdraw(connection, mango_options.mango_program_id, mangoGroup, marginAccount, wallet, tokenAccount.effectiveMint, tokenAccount.pubkey, Number(inputRef.current.state.value)).then((transSig: string) => {
        setWorking(false);
        notify({
          // @ts-ignore
          message: `Withdrew ${inputRef.current.state.value}${currency} into your account`,
          description: `Hash of transaction is ${transSig}`,
          type: 'info'
        });
      })
        .catch((err) => {
          setWorking(false);
          console.error(err);
          notify({
            message: 'Could not perform withdraw operation',
            description: 'Approve transaction from your wallet',
            type: 'error',
          });
        })
      return;
    }
    // @ts-ignore
    deposit(connection, mango_options.mango_program_id, mangoGroup, marginAccount, wallet, tokenAccount.effectiveMint, tokenAccount.pubkey, Number(inputRef.current.state.value)).then((transSig: string) => {
      setWorking(false);
      notify({
        // @ts-ignore
        message: `Deposited ${inputRef.current.state.value}${currency} into your account`,
        description: `Hash of transaction is ${transSig}`,
        type: 'info'
      });
    })
      .catch((err) => {
        setWorking(false);
        console.error(err);
        notify({
          message: 'Could not perform deposit operation',
          description: 'Approve transaction from your wallet',
          type: 'error',
        });
      })
  }

  const DepoModal = useMemo(() => {
    return <DepositModal
      mango_groups={props.mango_groups}
      visible={props.visible}
      onCancel={props.onCancel}
      handleClick={depositFunds}
      setCurrency={setCurrency}
      onSelectAccount={setTokenAccount}
      currency={currency}
      tokenAccount={tokenAccount}
      userUiBalance={userUiBalance}
      ref={inputRef}
      working={working}
      operation={props.operation}
    />
  }, [tokenAccount, currency, userUiBalance, props.visible, props.onCancel, working, props.mango_groups, props.operation])
  return (
    <>
      {DepoModal}
    </>
  )
}

// For the modal when a user wants to deposit
const DepositModal = React.forwardRef((props: {
  visible: boolean,
  working: boolean,
  operation: string, // Deposit or withdraw ?
  onCancel: () => void,
  setCurrency: (value: string) => void,
  handleClick: () => void,
  onSelectAccount: (value: TokenAccount) => void,
  mango_groups: string,
  currency: string,
  userUiBalance: () => void
  tokenAccount: TokenAccount | null
}, ref: any) => {
  return (
    <Modal
      centered
      title={<AccountSelector
        currency={props.currency}
        setTokenAccount={props.onSelectAccount}
        tokenAccount={props.tokenAccount}
      />
      }
      visible={props.visible} onCancel={props.onCancel} footer={null}>
      <CurrencyInput currencies={props.mango_groups.split('_')} setCurrency={props.setCurrency} currency={props.currency} userUiBalance={props.userUiBalance} ref={ref} />
      <RowBox
        align="middle"
        justify="space-around">
        <Col style={{ width: '12vw' }}>
          <Button
            block
            size="middle"
            style={{ backgroundColor: '#1b3a24', color: 'white' }}
            onClick={props.handleClick}
            loading={props.working}
          >
            {props.operation}
          </Button>
        </Col>
      </RowBox>
    </Modal>
  )
});


/**
 * 
 * @param accounts The list of margin accounts for this user
 */

function AccountSelector({ currency, setTokenAccount, tokenAccount }) {
  // Get the mangoGroup token account
  const { mangoGroupTokenAccounts, tokenAccountsMapping } = useMangoTokenAccount();
  const options = useMemo(() => {
    // @ts-ignore
    return mangoGroupTokenAccounts[currency] && mangoGroupTokenAccounts[currency].length > 0 ? (mangoGroupTokenAccounts[currency].map((account: TokenAccount, i: number) =>
    (
      <Option
        key={i}
        value={account.pubkey.toString()}
      >
        <Text code>{account.pubkey.toString().substr(0, 9) + '...' + account.pubkey.toString().substr(-9)}</Text>
      </Option>
    )))
      :
      <Option
        value="No Token Account"
        key=""
        disabled={true}
        style={{
          // @ts-ignore
          backgroundColor: 'rgb(39, 44, 61)'
        }}
      >
        <Text keyboard type="warning">No Account</Text>
      </Option>
  }, [currency]);

  useEffect(() => {
    // Set the first account for the token
    if (mangoGroupTokenAccounts[currency] && mangoGroupTokenAccounts[currency].length > 0) {
      setTokenAccount(mangoGroupTokenAccounts[currency][0]);
    } else {
      setTokenAccount(null);
    }
  }, [currency])

  return <div style={{ display: 'grid', justifyContent: 'center' }}>
    <Select
      size="large"
      listHeight={150}
      style={{ width: '250px' }}
      placeholder={"Select an account"}
      value={tokenAccount ? tokenAccount.pubkey.toString() : undefined}
      // @ts-ignore
      onChange={(e) => setTokenAccount(tokenAccountsMapping.current[e])}
    >
      {options}
    </Select>
  </div>
}
export default Deposit;