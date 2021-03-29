// For the dialog box component
import React, { useRef, useMemo, useState, useCallback } from 'react';
// Mango margin account hook
import { useMarginAccount, tokenPrecision as decimals } from '../../../utils/marginAccounts';
// Mango token accounts
import useMangoTokenAccount from '../../../utils/mangoTokenAccounts';
// Type annotation
import { MangoSrmAccount } from '@blockworks-foundation/mango-client/lib/client';
// Notifications
import { notify } from '../../../utils/notifications';
// Wallet and connection hooks
import { useConnection } from '../../../utils/connection';
import { useWallet } from '../../../utils/wallet';
// And now mango client library functions
import { deposit, initMarginAccountAndDeposit, withdraw } from '../../../utils/mango';
import DepositModal from './DepositModal';
import { PublicKey } from '@solana/web3.js';
import { TokenAccount } from '../../../utils/types';
import { formatBalanceDisplay } from '../../../utils/utils';

const Deposit = (props: {
  currency?: string;
  mango_groups: Array<string>;
  visible: boolean;
  operation: string;
  onCancel: () => void;
}) => {
  // Connection and wallet options
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  // Get the mango group and mango options
  const {
    marginAccount,
    mangoGroup,
    mango_groups,
    mango_options,
    setMarginAccount,
    setMarginAccounts,
    getMarginAccount,
  } = useMarginAccount();
  // Get the mangoGroup token account
  const { tokenAccountsMapping } = useMangoTokenAccount();
  // The current mango group tokens
  const [currency, setCurrency] = useState<string>(props.currency || mango_groups[0]);
  // Set the current token account upon currency change
  // The current token account
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | null>(null);
  // WOrking state
  const [working, setWorking] = useState(false);
  // Ref to get the underlying input box
  const inputRef = useRef<any>(null);

  // How much does this token account have
  const userBalance = useCallback(() => {
    if (
      props.operation === 'Deposit' &&
      tokenAccount &&
      tokenAccountsMapping.current[tokenAccount.pubkey.toString()]
    ) {
      return tokenAccountsMapping.current[tokenAccount.pubkey.toString()].balance;
    } else if (props.operation === 'Withdraw' && marginAccount && mangoGroup) {
      return marginAccount.getUiDeposit(mangoGroup, mango_groups.indexOf(currency));
    }
    return 0;
  }, [tokenAccount, tokenAccountsMapping, currency]);

  const userUiBalance = useCallback(() => {
    const fixedDecimals = decimals[currency] || 3;
    let bal = userBalance();

    return formatBalanceDisplay(bal, fixedDecimals).toFixed(fixedDecimals);
  }, [userBalance, currency]);
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

    if (marginAccount && wallet.publicKey.toString() !== marginAccount?.owner.toString()) {
      notify({
        message: 'Margin account owner does not match connected wallet',
        description: 'Please refresh the page and reconnect wallet',
        type: 'error',
      });
      return;
    }

    // @ts-ignore
    if (Number(inputRef.current.state.value) > Number(userBalance())) {
      notify({
        message: 'Not enough funds',
        description: 'Please Input Amount less than your balance',
        type: 'error',
      });
      return;
    } else if (!tokenAccount) {
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
        .then(async (response: Array<any>) => {
          let marginAcc;
          while (!marginAcc) {
            marginAcc = await getMarginAccount(response[0].publicKey);
          }
          // @ts-ignore
          setMarginAccounts((prev) => prev.concat(marginAcc));
          setMarginAccount(marginAcc);
          setWorking(false);
          notify({
            // @ts-ignore
            message: `Deposited ${inputRef.current.state.value} ${currency} into your account`,
            description: `Hash of transaction is ${response[1]}`,
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
  };

  const DepoModal = useMemo(() => {
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
    userBalance,
    props.visible,
    props.onCancel,
    working,
    props.mango_groups,
    props.operation,
  ]);
  return <>{DepoModal}</>;
};

export default Deposit;
