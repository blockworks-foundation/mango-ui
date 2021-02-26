import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Row, Col, Typography, Tag } from 'antd';
import styled from 'styled-components';
// import { useFeeDiscountKeys } from '../../utils/markets';
// import DataTable from '../layout/DataTable';
import { getTokenAccountInfo, parseTokenAccountData } from '../../utils/tokens';
import { TokenInstructions, getFeeRates, getFeeTier } from '@project-serum/serum';
import { percentFormat } from '../../utils/utils';
import { useConnection, useConnectionConfig } from '../../utils/connection';
import { RowBox, SizeTitle, ActionButton } from '../mango/componentStyles';
import { useMarginAccount } from '../../utils/marginAccounts';
import { IDS, MangoClient, MangoGroup } from '@mango/client';
import { PublicKey } from '@solana/web3.js';
import FloatingElement from '../layout/FloatingElement';
import Deposit from '../mango/Deposit/index';
import { nativeToUi } from '@mango/client/lib/utils';
import { SRM_DECIMALS } from '@project-serum/serum/lib/token-instructions';
import { useWallet } from '../../utils/wallet';
import { TokenAccount } from '../../utils/types';
import { DEFAULT_MANGO_GROUP } from '../../utils/mango';

type FeeRates = {
  taker: number;
  maker: number;
};

const FeeWrapper = styled.div`
  background: #212734;
`;

const DepositWrapper = styled.div`
  margin: 32px 0px;
  padding: 10px 20px;
  background-color: #1a2029;
`;

const useMangoGroup = () => {
  const [mangoGroup, setMangoGroup] = useState<MangoGroup | null>();
  const connection = useConnection();
  const { endpointInfo } = useConnectionConfig();
  const mangoGroupPk = new PublicKey(
    IDS[endpointInfo!.name].mango_groups[DEFAULT_MANGO_GROUP].mango_group_pk,
  );

  useEffect(() => {
    const getAcctInfo = async () => {
      const mangoClient = new MangoClient();
      const mangoGroup = await mangoClient.getMangoGroup(connection, mangoGroupPk);
      setMangoGroup(mangoGroup);
    };

    getAcctInfo();
  }, []);

  return mangoGroup;
};

export default function MangoFees() {
  const [totalSrm, setTotalSrm] = useState(0);
  const [contributedSrm, setContributedSrm] = useState(0);
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | undefined>();
  const [showDeposit, setShowDeposit] = useState<boolean>(false);
  const [feeRates, setFeeRates] = useState<FeeRates | null>(null);
  const operation = useRef('deposit');

  const connection = useConnection();
  const mangoGroup = useMangoGroup();
  const { marginAccount } = useMarginAccount();
  const { wallet, connected } = useWallet();
  const { endpointInfo } = useConnectionConfig();

  const SRM_ADDRESS = IDS[endpointInfo!.name].symbols['SRM'];

  const showModalDeposit = useCallback(() => {
    // Set the operation
    operation.current = 'Deposit';
    setShowDeposit((showDeposit) => true);
  }, []);
  const showModalWithdraw = useCallback(() => {
    // Set the operation
    operation.current = 'Withdraw';
    setShowDeposit((showDeposit) => true);
  }, []);
  // Hide the modal
  const hideModal = useCallback(() => {
    setShowDeposit((showDeposit) => false);
  }, []);

  const DepositModal = useMemo(() => {
    if (!tokenAccount) return null;
    return (
      <Deposit
        currency="SRM"
        mango_groups={['SRM']}
        visible={showDeposit}
        operation={operation.current}
        onCancel={hideModal}
        tokenAccount={tokenAccount}
      />
    );
  }, [showDeposit, hideModal, tokenAccount]);

  useEffect(() => {
    if (!mangoGroup) return;

    const getTotalSrm = async () => {
      // mango srm account info
      const srmAccountInfo = await connection.getAccountInfo(mangoGroup.srmVault);
      if (!srmAccountInfo) return;
      const accountData = parseTokenAccountData(srmAccountInfo.data);
      const amount = nativeToUi(accountData.amount, SRM_DECIMALS);
      setTotalSrm(amount);
      const feeTier = getFeeTier(0, amount);
      const rates = getFeeRates(feeTier);
      setFeeRates(rates);
      if (wallet && connected) {
        // connected wallet srm account info
        const walletTokenAccount = await getTokenAccountInfo(connection, wallet.publicKey);
        const walletSrmAcctData = walletTokenAccount.find(
          (acct) => acct.effectiveMint.toString() === SRM_ADDRESS,
        );
        setTokenAccount(walletSrmAcctData);
      }
    };

    getTotalSrm();
  }, [connection, mangoGroup]);

  useEffect(() => {
    if (marginAccount) {
      const srm = nativeToUi(marginAccount.srmBalance, SRM_DECIMALS);
      setContributedSrm(srm);
    }
  }, [marginAccount]);

  if (!mangoGroup) return null;

  return (
    <FeeWrapper>
      <Row style={{ padding: '32px 0px 8px 0px' }} align="middle" justify="center">
        <Col>
          <Typography>Total SRM in Mango: {totalSrm}</Typography>
        </Col>
      </Row>
      <Row align="middle" justify="center">
        <Col>Maker Fee: {feeRates ? percentFormat.format(feeRates.maker) : null}</Col>
      </Row>
      <Row align="middle" justify="center">
        <Col>Taker Fee: {feeRates ? percentFormat.format(feeRates.taker) : null}</Col>
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
