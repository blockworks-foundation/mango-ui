import { Divider, Row, Col, Popover, Typography, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons'
import { GreenButton } from '../componentStyles';
import React, { useEffect, useState } from 'react';
import FloatingElement from '../../layout/FloatingElement';
// Styled antd components
import { RowBox, LeftCol, RightCol, BalanceCol } from '../componentStyles';
import { useMarginAccount } from '../../../utils/marginAccounts';
// Connection hook
import { useConnection } from '../../../utils/connection'

const { Text } = Typography;
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

export default function MarginInfo() {
  // Connection hook
  const connection = useConnection();
  // Get our account info
  const { marginAccount, mangoGroup, maPending } = useMarginAccount();
  // Hold the margin account info
  const [mAccountInfo, setMAccountInfo] = useState<{ label: string, value: string, unit: string, desc: string }[] | null>(null);
  useEffect(() => {
    if (marginAccount && mangoGroup) {
      mangoGroup.getPrices(connection).then((prices) => {
        setMAccountInfo([
          {
            label: 'Equity',
            value: '$' + marginAccount.getAssetsVal(mangoGroup, prices).toFixed(1),
            unit: '',
            desc: 'Your total equity'
          },
          {
            // TODO: Get collaterization ratio
            label: 'Collateral Ratio',
            value: marginAccount.getCollateralRatio(mangoGroup, prices).toFixed(0),
            unit: '%',
            desc: 'Changes with asset'
          },
          {
            label: 'Maintainance Collateral Ratio',
            value: (mangoGroup.maintCollRatio * 100).toFixed(0),
            unit: '%',
            desc: 'Make sure you have this'
          },
          {
            label: 'Initial Collateral Ratio',
            value: (mangoGroup.initCollRatio * 100).toFixed(0),
            unit: '%',
            desc: 'Get this liquidity value first'
          },
        ]);
      })
    }
  }, [marginAccount, mangoGroup])
  return (
    <FloatingElement style={{ flex: 0.5, paddingTop: 10 }}>
      <React.Fragment>
        <Divider style={{ borderColor: 'white' }}>
          Margin Account Information
        </Divider>
        {maPending.sma ?
          <RowBox justify="space-around" >
            <Spin indicator={antIcon} />
          </RowBox>
          :
          marginAccount && mAccountInfo ? mAccountInfo.map((entry, i) => (
            <Row key={i} justify="space-around" style={{ padding: '10px' }}>
              <Popover
                content={entry.desc}
                placement="topLeft"
                trigger="hover"
              >
                <LeftCol span={14}>
                  <Text disabled code ellipsis={true}>
                    {entry.label}
                  </Text>
                </LeftCol>
              </Popover>
              <RightCol span={8}>
                <Text strong>
                  {entry.value}{entry.unit}
                </Text>
              </RightCol>
            </Row>
          ))
            :
            <RowBox justify="center">
              <BalanceCol>
                No Margin Account info available
              </BalanceCol>
            </RowBox>
        }
        <Row align="middle" justify="center">
          <Col span={8}>
            <GreenButton
              block
              size="middle"
              disabled={marginAccount && mAccountInfo && mAccountInfo?.length > 0 ? false : true}
            // onClick={props.handleClick}
            // loading={props.working}
            >
              Settle Borrows
          </GreenButton>
          </Col>
        </Row>
      </React.Fragment>
    </FloatingElement>
  );
}
