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
  max-height: 150px;
  overflow: auto;
`;

export const BalanceCol = styled(Col)`
  text-align: center;
`;

export const InterestCol = styled(BalanceCol)`
  color: rgb(2, 191, 118);
`;

/* const Tip = styled.p`
 *   font-size: 12px;
 *   padding-top: 6px;
 * `;
 *  */
export const ActionButton = styled(Button)`
  color: #2abdd2;
  background-color: #212734;
  border-width: 0px;
`;
