import { Col, Menu, Row, Select, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import logo from '../assets/icons/logo.svg';
import styled from 'styled-components';
import { useWallet, WALLET_PROVIDERS } from '../utils/wallet';
import { ENDPOINTS, useConnectionConfig } from '../utils/connection';
import WalletConnect from './WalletConnect';
import { getTradePageUrl } from '../utils/markets';

const { Title } = Typography;
const Wrapper = styled.div`
  background-color: #141026;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding: 0px 25px;
  flex-wrap: wrap;
`;
const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-weight: bold;
  cursor: pointer;
  img {
    height: 30px;
    margin-right: 8px;
  }
`;

const EXTERNAL_LINKS = {
  '/learn': 'https://serum-academy.com/en/serum-dex/',
  '/add-market': 'https://serum-academy.com/en/add-market/',
  '/wallet-support': 'https://serum-academy.com/en/wallet-support',
  '/dex-list': 'https://serum-academy.com/en/dex-list/',
  '/developer-resources': 'https://serum-academy.com/en/developer-resources/',
  '/explorer': 'https://explorer.solana.com',
  '/srm-faq': 'https://projectserum.com/srm-faq',
  '/swap': 'https://swap.projectserum.com',
};

export default function TopBar() {
  const { providerUrl, setProvider, wallet, connected } = useWallet();
  const { endpoint, endpointInfo, setEndpoint, availableEndpoints } = useConnectionConfig();
  const location = useLocation();
  const history = useHistory();
  const [searchFocussed] = useState(false);

  const handleClick = useCallback(
    (e) => {
      if (!(e.key in EXTERNAL_LINKS)) {
        history.push(e.key);
      }
    },
    [history],
  );

  const endpointInfoCustom = endpointInfo && endpointInfo.custom;
  useEffect(() => {
    const handler = () => {
      if (endpointInfoCustom) {
        setEndpoint(ENDPOINTS[0].endpoint);
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [endpointInfoCustom, setEndpoint]);

  const tradePageUrl = location.pathname.startsWith('/market/')
    ? location.pathname
    : getTradePageUrl();

  return (
    <>
      {/* <CustomClusterEndpointDialog
        visible={addEndpointVisible}
        testingConnection={testingConnection}
        onAddCustomEndpoint={onAddCustomEndpoint}
        onClose={() => setAddEndpointVisible(false)}
      /> */}
      <Wrapper>
        <LogoWrapper onClick={() => history.push(tradePageUrl)} style={{ marginBottom: '2px' }}>
          <img src={logo} alt="" />
          <h4
            className="ant-typography"
            style={{ fontFamily: 'Lato', fontWeight: 600, marginBottom: '2px' }}
          >
            Mango Markets
          </h4>
        </LogoWrapper>
        <Menu
          mode="horizontal"
          onClick={handleClick}
          selectedKeys={[location.pathname]}
          style={{
            borderBottom: 'none',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <Menu.Item key={tradePageUrl} style={{ margin: '0 10px 0 20px' }}>
            <Title level={5} style={{ fontWeight: 300, lineHeight: 3, marginBottom: 0 }}>
              Trade
            </Title>
          </Menu.Item>
          {(!searchFocussed || location.pathname === '/stats') && (
            <Menu.Item key="/stats" style={{ margin: '0 10px' }}>
              <Title level={5} style={{ fontWeight: 300, lineHeight: 3, marginBottom: 0 }}>
                Stats
              </Title>
            </Menu.Item>
          )}
          <Menu.Item key="/learn" style={{ margin: '0 10px' }}>
            <a href="https://docs.mango.markets/" target="_blank" rel="noopener noreferrer">
              <Title level={5} style={{ fontWeight: 300, lineHeight: 3, marginBottom: 0 }}>
                Learn
              </Title>
            </a>
          </Menu.Item>
          <Menu.Item key="/alerts" style={{ margin: '0 10px' }}>
            <Title level={5} style={{ fontWeight: 300, lineHeight: 3, marginBottom: 0 }}>
              Alerts
            </Title>
          </Menu.Item>
        </Menu>
        {/* <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingRight: 5,
          }}
        >
          <AppSearch
            onFocus={() => setSearchFocussed(true)}
            onBlur={() => setSearchFocussed(false)}
            focussed={searchFocussed}
            width={searchFocussed ? '350px' : '35px'}
          />
        </div> */}
        <div>
          <Row align="middle" style={{ paddingLeft: 5, paddingRight: 5 }} gutter={16}>
            {/* <Col>
              <PlusCircleOutlined
                style={{ color: '#2abdd2' }}
                onClick={() => setAddEndpointVisible(true)}
              />
            </Col> */}
            {/* <Col>
              <Popover
                content={endpoint}
                placement="bottomRight"
                title="URL"
                trigger="hover"
              >
                <InfoCircleOutlined style={{ color: '#2abdd2' }} />
              </Popover>
            </Col> */}
            <Col>
              <Select
                onSelect={setEndpoint}
                value={endpoint}
                style={{ marginRight: 8, width: '150px' }}
              >
                {availableEndpoints.map(({ name, endpoint }) => (
                  <Select.Option value={endpoint} key={endpoint}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            {/* {connected && (
              <div>
                <Popover
                  content={<Settings autoApprove={wallet?.autoApprove} />}
                  placement="bottomRight"
                  title="Settings"
                  trigger="click"
                >
                  <Button style={{ marginRight: 8 }}>
                    <SettingOutlined />
                    Settings
                  </Button>
                </Popover>
              </div>
            )} */}
            <Col>
              <div>
                <Select onSelect={setProvider} value={providerUrl}>
                  {WALLET_PROVIDERS.map(({ name, url }) => (
                    <Select.Option value={url} key={url}>
                      {name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col>
              <div>
                <WalletConnect />
              </div>
            </Col>
          </Row>
        </div>
      </Wrapper>
    </>
  );
}
