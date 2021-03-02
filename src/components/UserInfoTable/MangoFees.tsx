import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Row, Col, Typography } from 'antd';
import styled from 'styled-components';
import { IDS } from '@blockworks-foundation/mango-client';
import { nativeToUi } from '@blockworks-foundation/mango-client/lib/utils';
import { SRM_DECIMALS } from '@project-serum/serum/lib/token-instructions';

import { getTokenAccountInfo } from '../../utils/tokens';
import { percentFormat } from '../../utils/utils';
import { useConnection, useConnectionConfig } from '../../utils/connection';
import { RowBox, SizeTitle, ActionButton } from '../mango/componentStyles';
import { useMarginAccount } from '../../utils/marginAccounts';
import Deposit from '../mango/Deposit/index';
import { useWallet } from '../../utils/wallet';
import { TokenAccount } from '../../utils/types';
// import DepositModal from '../mango/Deposit/DepositModal';

const FeeWrapper = styled.div`
  background: #262337;
`;

const DepositWrapper = styled.div`
  margin: 32px 0px;
  padding: 10px 20px;
  background-color: #141026;
`;

// const DepositSrmMoal = (props) => {
//   const inputRef = useRef<any>(null);

//   return (
//     <>
//       <DepositModal
//         mango_groups={props.mango_groups}
//         visible={props.visible}
//         onCancel={props.onCancel}
//         handleClick={depositFunds}
//         setCurrency={setCurrency}
//         onSelectAccount={setSrmAccounts}
//         currency="SRM"
//         tokenAccount={tokenAccount}
//         userUiBalance={userUiBalance}
//         ref={inputRef}
//         working={working}
//         operation={props.operation}
//       />
//     </>
//   )
// }

export default function MangoFees() {
  const [contributedSrm, setContributedSrm] = useState(0);
  const [srmTokenAccounts, setSrmAccounts] = useState<TokenAccount[]>([]);
  const [showDeposit, setShowDeposit] = useState<boolean>(false);
  const operation = useRef('deposit');

  const connection = useConnection();
  const { marginAccount, mangoGroup, srmFeeRates, totalSrm } = useMarginAccount();
  const { wallet, connected } = useWallet();
  const { endpointInfo } = useConnectionConfig();

  /*
  1. Fetch this user's MangoSrmAccounts with client.getMangoSrmAccountsForOwner()
  2. Sort that list by MangoSrmAccount.amount and pick largest one
  3. If list is empty then just pass in null or don't pass in an arg for mangoSrmAccount: PublicKey in depositSrm()

  No need for the user's margin account

  To get user's srm balance use MangoSrmAccount.getUiSrmAmount()
   */

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
    if (!srmTokenAccounts.length) return null;
    return (
      <Deposit
        currency="SRM"
        mango_groups={['SRM']}
        visible={showDeposit}
        operation={operation.current}
        onCancel={hideModal}
        srmTokenAccounts={srmTokenAccounts}
      />
    );
  }, [showDeposit, hideModal, srmTokenAccounts]);

  useEffect(() => {
    const getTotalSrm = async () => {
      if (wallet && connected) {
        // connected wallet srm account info
        const walletTokenAccount = await getTokenAccountInfo(connection, wallet.publicKey);
        const walletSrmAccts = walletTokenAccount.filter(
          (acct) => acct.effectiveMint.toString() === SRM_ADDRESS,
        );

        setSrmAccounts(walletSrmAccts);
      }
    };
    console.log('gettingTotalSrm');

    getTotalSrm();
  }, [connection, wallet, connected, SRM_ADDRESS, marginAccount]);

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
