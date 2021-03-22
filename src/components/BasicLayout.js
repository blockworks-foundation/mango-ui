import { Layout, Button } from 'antd';
import React, { useState } from 'react';
import styled from 'styled-components';
import TopBar from './TopBar';
import { CustomFooter as Footer } from './Footer';
const { Header, Content } = Layout;

const AlphaAlert = styled.div`
  color: #ab9bf0;
  padding: 7px 25px;
  font-size: 16px;
  background-color: #393260;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const UsdtAlert = styled(AlphaAlert)`
  background-color: #4b4474;
`;

export default function BasicLayout({ children }) {
  const [showAlphaAlert, setShowAlphaAlert] = useState(true);
  const [showUsdtAlert, setShowUsdtAlert] = useState(true);

  return (
    <React.Fragment>
      <Layout style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
        {showAlphaAlert ? (
          <AlphaAlert>
            <div style={{ marginRight: 'auto' }}></div>
            <span style={{ letterSpacing: 0.5 }}>
              THIS IS AN UNAUDITED BETA RELEASE OF MANGO MARKETS. THE SOFTWARE IS PROVIDED 'AS IS'
              WITHOUT WARRANTY OF ANY KIND.
            </span>
            <Button
              size="large"
              type="link"
              onClick={() => setShowAlphaAlert(false)}
              style={{ padding: '0px 15px', height: 'unset', marginLeft: 'auto' }}
            >
              <span>X</span>
            </Button>
          </AlphaAlert>
        ) : null}
        {showUsdtAlert ? (
          <UsdtAlert>
            <div style={{ marginRight: 'auto' }}></div>
            <span style={{ letterSpacing: 0.5 }}>
              Serum DEX is transitioning all liquidity pairs from wrapped USDT (wUSDT) to native
              USDT. <a href="https://trade.mango.markets">Click here</a> to trade Native USDT.{' '}
              <a
                href="https://docs.mango.markets/tutorials/transfer-funds-to-sollet-wallet#how-to-swap-wrapped-usdt-for-native-usdt"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read more →
              </a>
            </span>
            <Button
              size="large"
              type="link"
              onClick={() => setShowUsdtAlert(false)}
              style={{ padding: '0px 15px', height: 'unset', marginLeft: 'auto' }}
            >
              <span>X</span>
            </Button>
          </UsdtAlert>
        ) : null}
        <Header style={{ padding: 0, minHeight: 64, height: 'unset' }}>
          <TopBar />
        </Header>
        <Content style={{ flex: 1 }}>{children}</Content>
        <Footer />
      </Layout>
    </React.Fragment>
  );
}
