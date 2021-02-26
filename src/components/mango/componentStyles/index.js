import styled from 'styled-components';
import { Button, Col, Row } from 'antd';

export const RowBox = styled(Row)`
  padding-top: 20px;
  padding-bottom: 20px;
`;
export const SizeTitle = styled(Row)`
  padding: 20px 0 14px;
  color: #434a59;
`;

export const ScrollBox = styled.div`
  max-height: 130px;
  overflow: auto;
`;

export const BalanceCol = styled(Col)`
  text-align: center;
`;

export const InterestCol = styled(BalanceCol)`
  color: #afd803;
`;
export const LeftCol = styled(Col)`
  text-align: left;
`;

export const RightCol = styled(Col)`
  text-align: right;
`;

export const ActionButton = styled(Button)`
  color: #f2c94c;
  background-color: #262337;
  border-width: 0px;
`;

export const GreenButton = styled(Button)`
  background-color: #1b3a24;
  color: white;
  border-width: 0px;
`;
