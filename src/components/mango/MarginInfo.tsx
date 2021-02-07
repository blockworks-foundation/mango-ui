import { Button, Col, Divider, Row } from 'antd';
import React from 'react';
import FloatingElement from '../layout/FloatingElement';
import styled from 'styled-components';

const RowBox = styled(Row)`
  padding-top: 20px;
  padding-bottom: 20px;
`;

const ScrollBox = styled.div`
  max-height: 150px;
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

const mockData = [{
  label: 'Collaborization',
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
  return (
    <FloatingElement style={{ flex: 0.5, paddingTop: 10 }}>
      <React.Fragment>
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
            <ActionButton block size="large" onClick={() => console.log('deposit')}>
              Settle PNL
            </ActionButton>
          </Col>
        </RowBox>
      </React.Fragment>
    </FloatingElement>
  );
}
