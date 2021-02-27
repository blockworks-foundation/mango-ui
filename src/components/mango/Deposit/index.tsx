// For the dialog box component
import React, { useRef, useMemo, useState, useCallback } from 'react';
// Mango margin account hook
import { useMarginAccount } from '../../../utils/marginAccounts';
// Mango token accounts
import useMangoTokenAccount from '../../../utils/mangoTokenAccounts';
// TYpe annotation
import { TokenAccount } from '../../../utils/types';
// Notifications
import { notify } from '../../../utils/notifications';
// Wallet and connection hooks
import { useConnection } from '../../../utils/connection';
import { useWallet } from '../../../utils/wallet';
// And now mango client library functions
import {
  deposit,
  depositSrm,
  initMarginAccountAndDeposit,
  withdraw,
  withdrawSrm,
} from '../../../utils/mango';
import DepositModal from './DepositModal';
import { MarginAccount } from '@mango/client';
import { parseTokenAccountData } from '../../../utils/tokens';
import { PublicKey } from '@solana/web3.js';

const Deposit = (props: {
  currency?: string;
  mango_groups: Array<string>;
  visible: boolean;
  operation: string;
  tokenAccount?: TokenAccount;
  onCancel: () => void;
}) => {
  // COnnection and wallet options
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  // Get the mango group and mango options
  const {
    marginAccount,
    mangoGroup,
    mango_groups,
    mango_options,
    createMarginAccount,
  } = useMarginAccount();
  // Get the mangoGroup token account
  const { tokenAccountsMapping } = useMangoTokenAccount();
  // The current mango group tokens
  const [currency, setCurrency] = useState<string>(props.currency || mango_groups[0]);
  // Set the current token account upon currency change
  // The current token account
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | null>(props.tokenAccount || null);
  // WOrking state
  const [working, setWorking] = useState(false);
  // Ref to get the underlying input box
  const inputRef = useRef<any>(null);

  // How much does this token account have
  const userUiBalance = useCallback(() => {
    if (currency === 'SRM') {
      const srmAccount =
        props.tokenAccount && props.tokenAccount.account
          ? parseTokenAccountData(props.tokenAccount.account.data)
          : null;

      return srmAccount?.amount;
    }
    if (tokenAccount && tokenAccountsMapping.current[tokenAccount.pubkey.toString()]) {
      return tokenAccountsMapping.current[tokenAccount.pubkey.toString()].balance;
    } else if (props.operation === 'Withdraw' && marginAccount && mangoGroup) {
      return marginAccount.getUiDeposit(mangoGroup, mango_groups.indexOf(currency));
    }
    return '0';
  }, [tokenAccount, tokenAccountsMapping, currency]);
  // TODO: Pack clinet library instruction into one
  // When the user hits deposit
  const depositFunds = async () => {
    if (!connected) {
      notify({
        message: 'Please connect to wallet first',
        description: 'Wallet not connected. Hit the connect wallet button',
        type: 'info',
      });
      return;
    }
    if (!inputRef?.current?.state?.value || Number(inputRef?.current?.state?.value) <= 0) {
      notify({
        message: 'Please input amount',
        description: 'No amount to deposit inputed',
        type: 'error',
      });
      return;
    }
    // @ts-ignore
    if (Number(inputRef.current.state.value) > Number(userUiBalance())) {
      notify({
        message: 'Not enough funds',
        description: 'Please Input Amount less than your balance',
        type: 'error',
      });
      return;
    } else if (!tokenAccount && !props.tokenAccount) {
      notify({
        message: 'Please create a token Account',
        description: 'Create a token acount for this currency',
        type: 'error',
      });
      return;
    }
    // We are working
    setWorking(true);
    // Call the deposit function of mangoCLIENT
    // Check if we are depositing or withdrawing
    if (props.operation === 'Withdraw') {
      if (currency === 'SRM') {
        withdrawSrm(
          connection,
          mango_options.mango_program_id,
          // @ts-ignore
          mangoGroup,
          marginAccount,
          wallet,
          // @ts-ignore
          props.tokenAccount.pubkey,
          // @ts-ignore
          Number(inputRef.current.state.value),
        )
          .then((transSig: string) => {
            setWorking(false);
            notify({
              // @ts-ignore
              message: `Withdrew ${inputRef.current.state.value} ${currency} into your account`,
              description: `Hash of transaction is ${transSig}`,
              type: 'info',
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
          });
        return;
      } else {
        withdraw(
          connection,
          mango_options.mango_program_id,
          // @ts-ignore
          mangoGroup,
          marginAccount,
          wallet,
          // @ts-ignore
          tokenAccount.effectiveMint,
          // @ts-ignore
          tokenAccount.pubkey,
          // @ts-ignore
          Number(inputRef.current.state.value),
        )
          .then((transSig: string) => {
            setWorking(false);
            notify({
              // @ts-ignore
              message: `Withdrew ${inputRef.current.state.value} ${currency} into your account`,
              description: `Hash of transaction is ${transSig}`,
              type: 'info',
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
          });
        return;
      }
    }

    if (currency === 'SRM') {
      depositSrm(
        connection,
        mango_options.mango_program_id,
        // @ts-ignore
        mangoGroup,
        marginAccount,
        wallet,
        // @ts-ignore
        props.tokenAccount.pubkey,
        // @ts-ignore
        Number(inputRef.current.state.value),
      )
        .then((transSig: string) => {
          setWorking(false);
          notify({
            // @ts-ignore
            message: `Deposited ${inputRef.current.state.value} ${currency} into your account`,
            description: `Hash of transaction is ${transSig}`,
            type: 'info',
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
        });
    } else {
      if (!marginAccount && mangoGroup) {
        initMarginAccountAndDeposit(
          connection,
          new PublicKey(mango_options.mango_program_id),
          mangoGroup,
          wallet,
          // @ts-ignore
          tokenAccount.effectiveMint,
          // @ts-ignore
          tokenAccount.pubkey,
          // @ts-ignore
          Number(inputRef.current.state.value),
        )
          .then((transSig: string) => {
            setWorking(false);
            notify({
              // @ts-ignore
              message: `Deposited ${inputRef.current.state.value} ${currency} into your account`,
              description: `Hash of transaction is ${transSig}`,
              type: 'info',
            });
            props.onCancel();
          })
          .catch((err) => {
            setWorking(false);
            console.error(err);
            notify({
              message: 'Could not perform init margin account and deposit operation',
              type: 'error',
            });
            props.onCancel();
          });
      } else {
        deposit(
          connection,
          mango_options.mango_program_id,
          // @ts-ignore
          mangoGroup,
          marginAccount,
          wallet,
          // @ts-ignore
          tokenAccount.effectiveMint,
          // @ts-ignore
          tokenAccount.pubkey,
          // @ts-ignore
          Number(inputRef.current.state.value),
        )
          .then((transSig: string) => {
            setWorking(false);
            notify({
              // @ts-ignore
              message: `Deposited ${inputRef.current.state.value} ${currency} into your account`,
              description: `Hash of transaction is ${transSig}`,
              type: 'info',
            });
            props.onCancel();
          })
          .catch((err) => {
            setWorking(false);
            console.error(err);
            notify({
              message: 'Could not perform deposit operation',
              type: 'error',
            });
            props.onCancel();
          });
      }
    }
  };

  const DepoModal = useMemo(() => {
    console.log('render deposit');
    return (
      <DepositModal
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
    );
  }, [
    tokenAccount,
    currency,
    userUiBalance,
    props.visible,
    props.onCancel,
    working,
    props.mango_groups,
    props.operation,
  ]);
  return <>{DepoModal}</>;
};

export default Deposit;
