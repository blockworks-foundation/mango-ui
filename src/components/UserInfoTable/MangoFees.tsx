import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Row, Col, Typography } from 'antd';
import styled from 'styled-components';
import { IDS } from '@blockworks-foundation/mango-client';
import { nativeToUi } from '@blockworks-foundation/mango-client/lib/utils';
import { SRM_DECIMALS } from '@project-serum/serum/lib/token-instructions';

import { getTokenAccountInfo, parseTokenAccountData } from '../../utils/tokens';
import { percentFormat } from '../../utils/utils';
import { useConnection, useConnectionConfig } from '../../utils/connection';
import { RowBox, SizeTitle, ActionButton } from '../mango/componentStyles';
import { useMarginAccount } from '../../utils/marginAccounts';
import { useWallet } from '../../utils/wallet';
import { PublicKey } from '@solana/web3.js';
import { MangoSrmAccount } from '@blockworks-foundation/mango-client/lib/client';
import CustomDepositModal from '../mango/Deposit/CustomDepositModal';
import { TokenAccount } from '../../utils/types';
import { accountFlagsLayout } from '@project-serum/serum/lib/layout';
import { notify } from '../../utils/notifications';
import { depositSrm, withdrawSrm } from '../../utils/mango';

const FeeWrapper = styled.div`
  background: #262337;
`;

const DepositWrapper = styled.div`
  margin: 32px 0px;
  padding: 10px 20px;
  background-color: #141026;
`;

export default function MangoFees() {
  const [contributedSrm, setContributedSrm] = useState(0);
  const [mangoSrmAccounts, setMangoSrmAccounts] = useState<MangoSrmAccount[]>([]);
  const [walletSrmAccounts, setWalletSrmAccounts] = useState<TokenAccount[]>([]);
  const [walletSrmBalance, setWalletSrmBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDeposit, setShowDeposit] = useState<boolean>(false);
  const operation = useRef('deposit');

  const connection = useConnection();
  const {
    marginAccount,
    mangoGroup,
    srmFeeRates,
    totalSrm,
    mangoClient,
    mango_options,
  } = useMarginAccount();
  const { wallet, connected } = useWallet();
  const { endpointInfo } = useConnectionConfig();
  const inputRef = useRef<HTMLInputElement>();
  /*
  1. Fetch this user's MangoSrmAccounts with client.getMangoSrmAccountsForOwner()
  2. Sort that list by MangoSrmAccount.amount and pick largest one
  3. If list is empty then just pass in null or don't pass in an arg for mangoSrmAccount: PublicKey in depositSrm()

  No need for the user's margin account

  To get user's srm balance use MangoSrmAccount.getUiSrmAmount()
   */

  const SRM_ADDRESS = IDS[endpointInfo!.name].symbols['SRM'];

  const showModalDeposit = useCallback(() => {
    operation.current = 'Deposit';
    setShowDeposit((showDeposit) => true);
  }, []);

  const showModalWithdraw = useCallback(() => {
    operation.current = 'Withdraw';
    setShowDeposit((showDeposit) => true);
  }, []);

  const hideModal = useCallback(() => {
    setShowDeposit((showDeposit) => false);
  }, []);

  const handleSubmit = (values) => {
    if (operation.current === 'Withdraw') {
      withdrawSrm(
        connection,
        new PublicKey(mango_options.mango_program_id),
        // @ts-ignore
        mangoGroup,
        wallet,
        // @ts-ignore
        new PublicKey(values.selectedAccount),
        values.amount,
        // @ts-ignore
        mangoSrmAccounts.length ? mangoSrmAccounts : null,
      )
        .then((transSig: string) => {
          setLoading(false);
          notify({
            // @ts-ignore
            message: `Withdrew ${inputRef.current.state.value} ${currency} into your account`,
            description: `Hash of transaction is ${transSig}`,
            type: 'info',
          });
          hideModal();
        })
        .catch((err) => {
          setLoading(false);
          console.error(err);
          notify({
            message: 'Could not perform withdraw operation',
            description: ``,
            type: 'error',
          });
          hideModal();
        });
    } else {
      depositSrm(
        connection,
        new PublicKey(mango_options.mango_program_id),
        // @ts-ignore
        mangoGroup,
        wallet,
        new PublicKey(values.selectedAccount),
        values.amount,
        mangoSrmAccounts.length ? mangoSrmAccounts : null,
      )
        .then((mangoSrmAcct: PublicKey) => {
          setLoading(false);
          notify({
            // @ts-ignore
            message: `Deposited ${inputRef.current.state.value} ${currency} into your account`,
            description: ``,
            type: 'info',
          });
          hideModal();
        })
        .catch((err) => {
          setLoading(false);
          console.error(err);
          notify({
            message: 'Could not perform deposit operation',
            description: '',
            type: 'error',
          });
          hideModal();
        });
    }
  };

  const DepositModal = useMemo(() => {
    return (
      <CustomDepositModal
        accounts={operation.current === 'Deposit' ? walletSrmAccounts : mangoSrmAccounts}
        balance={operation.current === 'Deposit' ? walletSrmBalance : mangoSrmAccounts[0]?.amount}
        currency="SRM"
        currencies={['SRM']}
        loading={loading}
        visible={showDeposit}
        operation={operation.current}
        onCancel={hideModal}
        handleSubmit={handleSubmit}
        ref={inputRef}
      />
    );
  }, [showDeposit, hideModal, walletSrmBalance, mangoSrmAccounts]);

  useEffect(() => {
    const getSrmAccounts = async () => {
      if (!mangoGroup || !connected) return;

      const usersMangoSrmAccounts = await mangoClient.getMangoSrmAccountsForOwner(
        connection,
        new PublicKey(mango_options.mango_program_id),
        mangoGroup,
        wallet,
      );
      setMangoSrmAccounts(usersMangoSrmAccounts);
      if (usersMangoSrmAccounts.length) {
        setContributedSrm(usersMangoSrmAccounts[0].amount);
      }

      if (wallet && connected) {
        // connected wallet srm account info
        const walletTokenAccount = await getTokenAccountInfo(connection, wallet.publicKey);
        const walletSrmAccts = walletTokenAccount.filter(
          (acct) => acct.effectiveMint.toString() === SRM_ADDRESS,
        );
        if (walletSrmAccts.length) {
          const accountsWithAmount = walletSrmAccts.map((acc) => {
            const amount = acc?.account?.data
              ? parseTokenAccountData(acc?.account?.data).amount
              : null;
            return { ...acc, amount };
          });
          setWalletSrmAccounts(accountsWithAmount);

          const srmWalletAmount = accountsWithAmount.reduce((acc, cur) => {
            return cur.amount ? acc + cur.amount : 0;
          }, 0);
          setWalletSrmBalance(nativeToUi(srmWalletAmount, SRM_DECIMALS));
        }
      }
    };

    getSrmAccounts();
  }, [connection, wallet, connected, SRM_ADDRESS, marginAccount]);

  return (
    <FeeWrapper>
      <Row style={{ padding: '32px 0px 8px 0px' }} align="middle" justify="center">
        <Col>
          <Typography>Total SRM in Mango: {totalSrm}</Typography>
        </Col>
      </Row>
      <Row align="middle" justify="center">
        <Col>Maker Fee: {srmFeeRates ? percentFormat.format(srmFeeRates.maker) : null}</Col>
      </Row>
      <Row align="middle" justify="center">
        <Col>Taker Fee: {srmFeeRates ? percentFormat.format(srmFeeRates.taker) : null}</Col>
      </Row>
      <Row align="middle" justify="center">
        <Col>
          <DepositWrapper>
            {true ? (
              <>
                <SizeTitle align="middle" justify="center">
                  Your Contributed SRM: {contributedSrm}
                </SizeTitle>
                <RowBox align="middle" justify="center">
                  <Col style={{ width: 120 }}>
                    <ActionButton block size="middle" onClick={showModalDeposit}>
                      Deposit
                    </ActionButton>
                  </Col>
                  <Col style={{ width: 120, marginLeft: 15 }}>
                    <ActionButton
                      block
                      size="middle"
                      disabled={marginAccount ? false : true}
                      onClick={showModalWithdraw}
                    >
                      Withdraw
                    </ActionButton>
                  </Col>
                </RowBox>
              </>
            ) : (
              `Connect a wallet to deposit SRM`
            )}
          </DepositWrapper>
        </Col>
      </Row>
      {DepositModal}
    </FeeWrapper>
  );
}
