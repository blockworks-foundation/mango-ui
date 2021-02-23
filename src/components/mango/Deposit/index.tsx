// For the dialog box component
import React, { useRef, useMemo, useState, useCallback } from 'react';
// Mango margin account hook
import { useMarginAccount } from '../../../utils/marginAccounts';
// Mango token accounts
import useMangoTokenAccount from '../../../utils/mangoTokenAccounts'
// TYpe annotation
import { TokenAccount } from '../../../utils/types';
// Notifications
import { notify } from '../../../utils/notifications'
// Wallet and connection hooks
import { useConnection } from '../../../utils/connection';
import { useWallet } from '../../../utils/wallet';
// And now mango client library functions
import { deposit, withdraw } from '../../../utils/mango';
import DepositModal from './DepositModal';
import { MarginAccount } from '@mango/client';

const Deposit = (props: {
  mango_groups: Array<string>,
  visible: boolean,
  operation: string,
  onCancel: () => void,
}) => {
  // COnnection and wallet options
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  // Get the mango group and mango options
  const { marginAccount, mangoGroup, mango_groups, mango_options, createMarginAccount } = useMarginAccount();
  // Get the mangoGroup token account
  const { tokenAccountsMapping } = useMangoTokenAccount();
  // The current mango group tokens
  const [currency, setCurrency] = useState<string>(mango_groups[0]);
  // Set the current token account upon currency change
  // The current token account 
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | null>(null);
  // WOrking state
  const [working, setWorking] = useState(false);
  // Ref to get the underlying input box
  const inputRef = useRef(null);

  // How much does this token account have
  const userUiBalance = useCallback(() => {
    if (tokenAccount && tokenAccountsMapping.current[tokenAccount.pubkey.toString()]) {
      return tokenAccountsMapping.current[tokenAccount.pubkey.toString()].balance;
    }
    return '0';
  }, [tokenAccount, tokenAccountsMapping]);
  // TODO: Pack clinet library instruction into one
  // When the user hits deposit
  const depositFunds = async () => {
    if (!connected) {
      notify({
        message: 'Please Connect to wallet first',
        description: 'Wallet not connected. Hit the connect wallet button',
        type: 'info'
      });
      return;
    }
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
    } else if (!tokenAccount) {
      notify({
        message: 'Please create a token Account',
        description: 'Create a token acount for this currency',
        type: 'error'
      });
      return;
    }
    // We are working
    setWorking(true);
    // If user has no margin account, let's create one
    let newMarginAcc: MarginAccount | null;
    if (!marginAccount) {
      // Create a margin account for the user
      newMarginAcc = await createMarginAccount();
      if (!newMarginAcc) {
        // COuld not create a margin account
        notify({
          message: 'Could not cereate a margin account',
          description: 'Please make sure you approve your transaction from your wallet',
          type: 'error'
        });
        setWorking(false);
        return;
      }
    }
    // Call the deposit function of mangoCLIENT
    // Check if we are depositing or withdrawing
    if (props.operation === 'Withdraw') {
      // @ts-ignore
      withdraw(connection, mango_options.mango_program_id, mangoGroup, marginAccount || newMarginAcc, wallet, tokenAccount.effectiveMint, tokenAccount.pubkey, Number(inputRef.current.state.value)).then((transSig: string) => {
        setWorking(false);
        notify({
          // @ts-ignore
          message: `Withdrew ${inputRef.current.state.value}${currency} into your account`,
          description: `Hash of transaction is ${transSig}`,
          type: 'info'
        });
        props.onCancel();
      })
        .catch((err) => {
          setWorking(false);
          console.error(err);
          notify({
            message: 'Could not perform withdraw operation',
            description: 'Approve transaction from your wallet',
            type: 'error',
          });
          props.onCancel();
        })
      return;
    };
    // @ts-ignore
    deposit(connection, mango_options.mango_program_id, mangoGroup, marginAccount || newMarginAcc, wallet, tokenAccount.effectiveMint, tokenAccount.pubkey, Number(inputRef.current.state.value)).then((transSig: string) => {
      setWorking(false);
      notify({
        // @ts-ignore
        message: `Deposited ${inputRef.current.state.value}${currency} into your account`,
        description: `Hash of transaction is ${transSig}`,
        type: 'info'
      });
      props.onCancel();
    })
      .catch((err) => {
        setWorking(false);
        console.error(err);
        notify({
          message: 'Could not perform deposit operation',
          description: 'Approve transaction from your wallet',
          type: 'error',
        });
        props.onCancel();
      })
  };

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

export default Deposit;