import React from 'react';
import { Layout, Row, Col, Grid } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import Link from './Link';
import { helpUrls } from './HelpUrls';

const { Footer } = Layout;
const { useBreakpoint } = Grid;

// TODO: Put all links in tokenMap
const footerElements = [
  {
    description: 'Discord',
    link: helpUrls.discord,
    icon: (
      <img
        alt="Discord"
        src={require('../assets/icons/discord.svg')}
        style={{ width: '25px', height: '20px' }}
      ></img>
    ),
  },
  {
    description: 'GitHub',
    link: helpUrls.github,
    icon: (
      <img
        alt="Discord"
        src={require('../assets/icons/github.svg')}
        style={{ width: '25px', height: '20px' }}
      ></img>
    ),
  },
  {
    description: 'Solana',
    link: helpUrls.solana,
    icon: (
      <img
        alt="Solana"
        src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png"
        style={{ width: '35px', height: '30px' }}
      ></img>
    ),
  },
];

export const CustomFooter = () => {
  const smallScreen = !useBreakpoint().lg;

  return (
    <Footer
      style={{
        height: '45px',
        paddingBottom: 10,
        paddingTop: 10,
        background: '#141026',
      }}
    >
      <Row align="middle" gutter={[25, 4]} justify="center">
        {!smallScreen && (
          <>
            {footerElements.map((elem, index) => {
              return (
                <Col key={index + ''}>
                  <Link external to={elem.link}>
                    {elem.description}
                  </Link>
                </Col>
              );
            })}
          </>
        )}
      </Row>
    </Footer>
  );
};
