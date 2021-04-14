import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Row, Col, Typography } from 'antd';
import styled from 'styled-components';
import { IDS } from '@blockworks-foundation/mango-client';

import { getTokenAccountInfo, parseTokenAccountData } from '../../utils/tokens';
import { percentFormat } from '../../utils/utils';
import { useConnection, useConnectionConfig } from '../../utils/connection';
import { RowBox, SizeTitle, ActionButton } from '../mango/componentStyles';
import { useMarginAccount } from '../../utils/marginAccounts';
import { useWallet } from '../../utils/wallet';
import { PublicKey } from '@solana/web3.js';
import CustomDepositModal from '../mango/Deposit/CustomDepositModal';
import { TokenAccount } from '../../utils/types';
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
  const [walletSrmAccounts, setWalletSrmAccounts] = useState<TokenAccount[]>([]);
  // const [walletSrmBalance, setWalletSrmBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const operation = useRef('deposit');

  const connection = useConnection();
  const {
    mangoSrmAccounts,
    mangoGroup,
    srmFeeRates,
    totalSrm,
    contributedSrm,
    mango_options,
    getUserSrmInfo,
  } = useMarginAccount();
  const { wallet, connected } = useWallet();
  const { endpointInfo } = useConnectionConfig();
  const inputRef = useRef<HTMLInputElement>();
  const SRM_ADDRESS = IDS[endpointInfo!.name].symbols['SRM'];

  const showModalDeposit = useCallback(() => {
    operation.current = 'Deposit';
    setShowModal((showModal) => true);
  }, []);

  const showModalWithdraw = useCallback(() => {
    operation.current = 'Withdraw';
    setShowModal((showModal) => true);
  }, []);

  const hideModal = useCallback(() => {
    setShowModal((showModal) => false);
  }, []);

  const handleSubmit = (values) => {
    console.log('submitting', values);

    if (!mangoGroup) return;
    setLoading(true);
    if (operation.current === 'Withdraw') {
      if (!mangoSrmAccounts) return;
      let selectedSrmAccount = values.selectedSrmAccount
        ? mangoSrmAccounts.find((m) => m.publicKey.toString() === values.selectedSrmAccount)
        : mangoSrmAccounts[0];

      withdrawSrm(
        connection,
        new PublicKey(mango_options.mango_program_id),
        mangoGroup,
        selectedSrmAccount || mangoSrmAccounts[0],
        wallet,
        new PublicKey(values.selectedAccount),
        values.amount,
      )
        .then((transSig: string) => {
          getUserSrmInfo();
          setLoading(false);
          notify({
            // @ts-ignore
            message: `Withdrew ${inputRef.current.state.value} SRM into your account`,
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
        mangoGroup,
        wallet,
        new PublicKey(values.selectedAccount),
        values.amount,
        mangoSrmAccounts?.length ? mangoSrmAccounts[0].publicKey : undefined,
      )
        .then((mangoSrmAcct: PublicKey) => {
          getUserSrmInfo();
          getSrmAccounts();
          setLoading(false);
          notify({
            // @ts-ignore
            message: `Deposited ${inputRef.current.state.value} SRM into your account`,
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

  const getSrmAccounts = useCallback(async () => {
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
      }
    }
  }, [connection, wallet, connected, SRM_ADDRESS]);

  useEffect(() => {
    getSrmAccounts();
  }, [getSrmAccounts]);

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
            {connected ? (
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
                      disabled={contributedSrm ? false : true}
                      onClick={showModalWithdraw}
                    >
                      Withdraw
                    </ActionButton>
                  </Col>
                </RowBox>
              </>
            ) : (
              <ActionButton size="large" onClick={wallet.connect} style={{ color: '#f2c94c' }}>
                Connect a wallet to deposit SRM
              </ActionButton>
            )}
          </DepositWrapper>
        </Col>
      </Row>
      {showModal ? (
        <CustomDepositModal
          accounts={walletSrmAccounts}
          currency="SRM"
          currencies={['SRM']}
          loading={loading}
          visible={showModal}
          operation={operation.current}
          onCancel={hideModal}
          handleSubmit={handleSubmit}
          mangoSrmAccounts={mangoSrmAccounts}
          ref={inputRef}
        />
      ) : null}
    </FeeWrapper>
  );
}
