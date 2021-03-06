import { Layout, Button } from 'antd';
import React, { useState } from 'react';
import styled from 'styled-components';
import TopBar from './TopBar';
import { CustomFooter as Footer } from './Footer';
const { Header, Content } = Layout;

const Alert = styled.div`
  color: #ab9bf0;
  padding: 8px 25px;
  font-size: 16px;
  background-color: #393260;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export default function BasicLayout({ children }) {
  const [showAlert, setShowAlert] = useState(true);

  return (
    <React.Fragment>
      <Layout style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
        {showAlert ? (
          <Alert>
            <span style={{ letterSpacing: 0.5 }}>
              THIS IS AN UNAUDITED ALPHA RELEASE OF MANGO MARKETS. THE SOFTWARE IS PROVIDED 'AS IS'
              WITHOUT WARRANTY OF ANY KIND.
            </span>
            <Button
              size="large"
              type="link"
              onClick={() => setShowAlert(false)}
              style={{ padding: '0px 15px', height: 'unset' }}
            >
              <span>X</span>
            </Button>
          </Alert>
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
