import { Button, Col, Divider, Row, Select } from 'antd';
import React from 'react';
import FloatingElement from '../layout/FloatingElement';
import styled from 'styled-components';
// Popover for extra info
import { Popover } from "antd";
import { InfoCircleOutlined } from '@ant-design/icons';
// Margin Account context
import { useMarginAccount } from '../../utils/marginAccounts'
import { MarginAccount } from '@mango/client';
import { PublicKey } from '@solana/web3.js';


const { Option, OptGroup } = Select;

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
        Switch Account
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
        <RowBox align="middle" justify="space-around">
          <Col style={{ width: 150 }}>
            <div style={{ display: "inline-flex" }}>
              {settlePnLInfo()}
              <ActionButton block size="large" >
                Settle PnL
            </ActionButton>
            </div>
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
  return <div style={{ display: 'grid', justifyContent: 'center' }}>
    <Select
      size="large"
      placeholder={marginAccount?.publicKey.toString() || "Select Margin Account"}
      listHeight={200}
      style={{ width: '300px' }}
      value={marginAccount?.publicKey.toString()}
      // @ts-ignore
      onSelect={(e) => setMarginAccount(mapping.get(e))}
    >
      {
        marginAccounts.length > 0 ? (
          <>
            <OptGroup label="BTC/ETH/USDC">
              {
                // @ts-ignore
                marginAccounts.filter(account => account.publicKey.toBase58() !== marginAccount?.publicKey.toBase58()).map((marginAccount: MarginAccount, i) => (
                  <Option
                    value={marginAccount.publicKey.toString()}
                    key={i}
                    name={marginAccount.publicKey.toString()}
                  >

                  </Option>
                ))
              }
            </OptGroup>
          </>
        ) :
          (
            <Option
              value="No Margin Account"
              key=""
              name="No Margin Account"
              disabled={true}
              style={{

                // @ts-ignore
                backgroundColor: 'rgb(39, 44, 61)'
              }}
            >
            </Option>
          )
      }
    </Select>
  </div>
}

