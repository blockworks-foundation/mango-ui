import React from 'react';
import { Col, Row } from 'antd';
import styled from 'styled-components';
import AlertForm from '../components/AlertForm';

const Wrapper = styled.div`
  flex-direction: column;
  padding: 16px 16px;
  .borderNone .ant-select-selector {
    border: none !important;
  }
`;

export default function AlertPage() {
  return (
    <>
      <AlertPageInner />
    </>
  );
}

function AlertPageInner() {

  const component = (() => {
    return (
      <Row
        style={{
          flexWrap: 'nowrap',
          justifyContent: 'center',
        }}
      >
        <Col flex="420px" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <AlertForm style={{ minHeight: 300 }} />
        </Col>
      </Row>
    );
  })();

  return (
    <>
      <Wrapper>
        {component}
      </Wrapper>
    </>
  );
}
