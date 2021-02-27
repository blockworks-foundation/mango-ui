import { Row, Col, Popover, Typography, Spin, Tooltip } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { ActionButton } from '../componentStyles';
import React, { useEffect, useState } from 'react';
import FloatingElement from '../../layout/FloatingElement';
// Styled antd components
import { RowBox, LeftCol, RightCol, BalanceCol } from '../componentStyles';
import { useMarginAccount } from '../../../utils/marginAccounts';
// Connection hook
import { useConnection } from '../../../utils/connection';
// Mango client library
import { settleBorrow } from '../../../utils/mango';
// Wallet hook
import { useWallet } from '../../../utils/wallet';

const { Text } = Typography;
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

export default function MarginInfo() {
  // Connection hook
  const connection = useConnection();
  // Wallet hook
  const { wallet } = useWallet();
  // Get our account info
  const { marginAccount, mango_options, mangoGroup, maPending } = useMarginAccount();
  // Working state
  const [working, setWorking] = useState(false);
  // Hold the margin account info
  const [mAccountInfo, setMAccountInfo] = useState<
    { label: string; value: string; unit: string; desc: string; currency: string }[] | null
  >(null);

  // Settle bororows
  const settleBorrows = async () => {
    // Set that we are working
    if (mangoGroup && marginAccount) {
      mangoGroup.tokens.forEach((token, i) => {
        setWorking(true);
        // Call settle on each token
        settleBorrow(
          connection,
          mango_options.mango_program_id,
          mangoGroup,
          marginAccount,
          wallet,
          token,
          marginAccount.getUiBorrow(mangoGroup, i) * 2,
        )
          .then(() => setWorking(false))
          .catch((err) => console.error('Error settling borrows', err));
      });
    }
  };
  useEffect(() => {
    if (mangoGroup) {
      mangoGroup.getPrices(connection).then((prices) => {
        const collateralRatio = marginAccount
          ? marginAccount.getCollateralRatio(mangoGroup, prices)
          : 200;

        setMAccountInfo([
          {
            label: 'Equity',
            value: marginAccount ? marginAccount.computeValue(mangoGroup, prices).toFixed(2) : '0',
            unit: '',
            currency: '$',
            desc: 'The value of the account',
          },
          {
            // TODO: Get collaterization ratio
            label: 'Collateral Ratio',
            value: collateralRatio > 2 ? '>200' : (100 * collateralRatio).toFixed(0),
            unit: '%',
            currency: '',
            desc: 'The current collateral ratio',
          },
          {
            label: 'Maint. Collateral Ratio',
            value: (mangoGroup.maintCollRatio * 100).toFixed(0),
            unit: '%',
            currency: '',
            desc: 'The collateral ratio you must maintain to not get liquidated',
          },
          {
            label: 'Initial Collateral Ratio',
            value: (mangoGroup.initCollRatio * 100).toFixed(0),
            currency: '',
            unit: '%',
            desc: 'The collateral ratio required to open a new margin position',
          },
        ]);
      });
    }
  }, [marginAccount, mangoGroup]);
  return (
    <FloatingElement style={{ flex: 0.5, paddingTop: 10 }}>
      <React.Fragment>
        {maPending.sma ? (
          <RowBox justify="space-around">
            <Spin indicator={antIcon} />
          </RowBox>
        ) : mAccountInfo ? (
          mAccountInfo.map((entry, i) => (
            <Row key={i} justify="space-around" style={{ padding: '10px' }}>
              <Popover content={entry.desc} placement="topLeft" trigger="hover">
                <LeftCol span={14}>
                  <Text disabled code ellipsis={true}>
                    {entry.label}
                  </Text>
                </LeftCol>
              </Popover>
              <RightCol span={8}>
                <Text strong>
                  {entry.currency +
                    (isNaN(Number(entry.value)) || Number(entry.value) >= Number.MAX_VALUE
                      ? '>200'
                      : entry.value)}
                  {entry.unit}
                </Text>
              </RightCol>
            </Row>
          ))
        ) : (
          <RowBox justify="center" align="middle">
            <BalanceCol></BalanceCol>
          </RowBox>
        )}
        <RowBox align="middle" justify="space-around">
          <Col span={8}>
            <ActionButton
              block
              size="middle"
              disabled={marginAccount && mAccountInfo && mAccountInfo?.length > 0 ? false : true}
              onClick={settleBorrows}
              loading={working}
            >
              Settle Borrows
            </ActionButton>
          </Col>
        </RowBox>
      </React.Fragment>
    </FloatingElement>
  );
}
