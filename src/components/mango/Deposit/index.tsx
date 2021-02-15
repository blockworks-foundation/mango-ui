// For the dialog box component
import React, { useRef, useMemo, useState } from 'react';
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

const { Option } = Select;
const { Text } = Typography;

const Deposit = (props: {
  mango_groups: string,
  visible: boolean,
  onCancel: () => void,
}) => {
  // The current token account 
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | null>(null);
  // COnnection and wallet options
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  // Get the mango group and mango options
  const { marginAccount, mangoGroup, mango_groups, mango_options, mangoClient } = useMarginAccount();
  // The current mango group tokens
  const [currency, setCurrency] = useState<string>(mango_groups.split('_')[0]);
  // WOrking state
  const [working, setWorking] = useState(false);
  // Ref to get the underlying input box
  const inputRef = useRef(null);
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
    // @ts-ignore
    deposit(
      connection,
      mango_options.mango_program_id,
      mangoGroup, marginAccount,
      wallet,
      tokenAccount.effectiveMint,
      tokenAccount.pubkey,
      // @ts-ignore
      Number(inputRef.current.state.value)
    ).then((transSig: string) => {
      setWorking(false);
      notify({
        // @ts-ignore
        message: `Deposited ${inputRef.current.state.value} into your account`,
        description: `Hash of transaction is ${transSig}`,
        type: 'info'
      });
    })
      .catch((err) => {
        setWorking(false);
        console.error(err);
        notify({
          message: 'Could perform deposit operation',
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
      mintDecimals={mangoGroup?.mintDecimals || []}
      ref={inputRef}
      working={working}
    />
  }, [tokenAccount, currency, props.visible, props.onCancel, working])
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
  onCancel: () => void,
  setCurrency: (value: string) => void,
  handleClick: () => void,
  onSelectAccount: (value: TokenAccount) => void,
  mango_groups: string,
  currency: string,
  mintDecimals: Array<number> | []
  tokenAccount: TokenAccount | null
}, ref: any) => {
  return (
    <Modal
      title={<AccountSelector
        currency={props.currency}
        setTokenAccount={props.onSelectAccount}
      />
      }
      visible={props.visible} onCancel={props.onCancel} footer={null}>
      <CurrencyInput currencies={props.mango_groups.split('_')} setCurrency={props.setCurrency} tokenAccount={props.tokenAccount} currency={props.currency} mintDecimals={props.mintDecimals} ref={ref} />
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
            Deposit
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

function AccountSelector({ currency, setTokenAccount }) {
  // Get the mangoGroup token account
  const { mangoGroupTokenAccounts, tokenAccountsMapping } = useMangoTokenAccount()
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

  return <div style={{ display: 'grid', justifyContent: 'center' }}>
    <Select
      size="large"
      listHeight={150}
      style={{ width: '250px' }}
      placeholder={"Select Account"}
      // @ts-ignore
      onChange={(e) => setTokenAccount(tokenAccountsMapping.current[e])}
    >
      {options}
    </Select>
  </div>
}
export default Deposit;