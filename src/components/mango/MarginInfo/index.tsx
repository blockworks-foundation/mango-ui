import { Typography, Button, Col, Divider, Row, Select } from 'antd';
import React, { useMemo } from 'react';
import FloatingElement from '../../layout/FloatingElement';
import styled from 'styled-components';
// Popover for extra info
import { Popover } from "antd";
import { InfoCircleOutlined } from '@ant-design/icons';
// Margin Account context
import { useMarginAccount } from '../../../utils/marginAccounts'
import { MarginAccount } from '@mango/client';
import { PublicKey } from '@solana/web3.js';


const { Option } = Select;
const { Text } = Typography;

const RowBox = styled(Row)`
  padding-top: 5px;
  padding-bottom: 1px;
`;

const ScrollBox = styled.div`
  max-height: 70px;
  overflow: auto;
`

const LeftCol = styled(Col)`
  text-align: left;
`

const RightCol = styled(Col)`
  text-align: right;
`

const ActionButton = styled(Button)`
  color: #2abdd2;
  background-color: #212734;
  border-width: 0px;
`;


// Popover for the margin account info settle profit and loss button
const settlePnLInfo = () => {
  return (<Popover
    content="Settle Profit and Loss"
    placement="topRight"
    trigger="hover"
  >
    <InfoCircleOutlined style={{ color: '#2abdd2' }} />
  </Popover>);
}

const mockData = [{
  label: 'Collaterization',
  value: (Math.random() * 100).toFixed(2),
}, {
  label: 'Equity',
  value: (Math.random() * 1000).toFixed(2),
}, {
  label: 'Available Equity',
  value: (Math.random() * 100).toFixed(2),
}, {
  label: 'Unsettled PNL',
  value: (Math.random() * 100).toFixed(2),
}]

export default function MarginInfo() {
  // Get our account info
  const { marginAccount, marginAccounts, setMarginAccount, keyMappings, } = useMarginAccount();
  return (
    <FloatingElement style={{ flex: 0.5, paddingTop: 10 }}>
      <Divider style={{ borderColor: 'white' }}>
        Switch Margin Account
        </Divider>
      <React.Fragment>
        <AccountSelector
          marginAccount={marginAccount}
          marginAccounts={marginAccounts}
          setMarginAccount={setMarginAccount}
          keyMappings={keyMappings}
        />
        <Divider style={{ borderColor: 'white' }}>
          Margin Account Information
        </Divider>
        <ScrollBox>
          {mockData.map((entry, i) => (
            <Row key={i}>
              <LeftCol style={{ textAlign: 'left' }} span={12}>{entry.label}</LeftCol>
              <RightCol style={{ textAlign: 'right' }} span={12}>{entry.value}</RightCol>
            </Row>
          ))}
        </ScrollBox>
        <RowBox align="middle" justify="center">
          <Col style={{ width: 150 }}>
            <ActionButton
              icon={<Popover
                content="Settle Profit and Loss"
                placement="topRight"
                trigger="hover"
              >
                <InfoCircleOutlined style={{ color: '#2abdd2' }} />
              </Popover>}
              block size="large"
              onMouseOver={settlePnLInfo}
            >
              Settle PnL
            </ActionButton>

          </Col>
        </RowBox>
      </React.Fragment>
    </FloatingElement>
  );
}

/**
 * 
 * @param accounts The list of margin accounts for this user
 */
// TODO: Get account object structure
// TODO: Use hooks to get current selected account
function AccountSelector({ keyMappings, marginAccounts, marginAccount, setMarginAccount }) {
  // Build a map of pubkeys to margin accounts
  const mapping: Map<PublicKey, MarginAccount> = keyMappings();
  const options = useMemo(() => {
    return marginAccounts.length > 0 ?
      // @ts-ignore
      (marginAccounts.map((marginAccount: MarginAccount, i: number) =>
      (
        <Option
          key={i}
          value={marginAccount.publicKey.toString()}
        >
          <Text code>
            {marginAccount.publicKey.toString().substr(0, 9) + '...' + marginAccount.publicKey.toString().substr(-9)}
          </Text>
        </Option>
      )))
      :
      <Option
        value="No Margin Account"
        key=""
        disabled={true}
        style={{
          // @ts-ignore
          backgroundColor: 'rgb(39, 44, 61)'
        }}
      >
        <Text keyboard type="warning">No Margin Account</Text>
      </Option>
  }, [marginAccounts]);

  return <div style={{ display: 'grid', justifyContent: 'center' }}>
    <Select
      size="large"
      placeholder={"Select an account"}
      value={marginAccount ? marginAccount.publicKey.toString() : undefined}
      listHeight={200}
      style={{ width: '250px' }}
      // @ts-ignore
      onChange={(e) => setMarginAccount(mapping.get(e))}
    >
      {options}
    </Select>
  </div>
}

