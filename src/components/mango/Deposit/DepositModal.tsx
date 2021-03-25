import React from 'react';
// Get our currency input component
import { CurrencyInput } from '../CurrencyInput';
// Components from antd
import { Modal, Col, Typography, Row } from 'antd';
// Styled components
import { RowBox, ActionButton } from '../componentStyles';
// TYpe annotation
import { TokenAccount } from '../../../utils/types';
// Import Acount selector
import AccountSelector from './TokenAccountSelector';

// For the modal when a user wants to deposit
const DepositModal = React.forwardRef(
  (
    props: {
      visible: boolean;
      working: boolean;
      operation: string; // Deposit or withdraw ?
      onCancel: () => void;
      setCurrency: (value: string) => void;
      handleClick: () => void;
      onSelectAccount: (value: TokenAccount) => void;
      mango_groups: Array<string>;
      currency: string;
      userUiBalance: () => void;
      tokenAccount: TokenAccount | null;
    },
    ref: any,
  ) => {
    return (
      <Modal
        title={
          <AccountSelector
            currency={props.currency}
            setTokenAccount={props.onSelectAccount}
            tokenAccount={props.tokenAccount}
          />
        }
        onCancel={props.onCancel}
        visible={props.visible}
        footer={null}
      >
        <CurrencyInput
          currencies={props.mango_groups}
          setCurrency={props.setCurrency}
          currency={props.currency}
          userUiBalance={props.userUiBalance}
          setTokenAccount={props.onSelectAccount}
          ref={ref}
        />
        <RowBox align="middle" justify="center" gutter={[16, 16]}>
          <Col span={8}>
            <ActionButton
              block
              size="middle"
              onClick={() => {
                ref.current.setState({ value: props.userUiBalance() });
              }}
              style={{ background: '#141026' }}
            >
              Max
            </ActionButton>
          </Col>
          <Col span={8}>
            <ActionButton
              block
              size="middle"
              onClick={props.handleClick}
              loading={props.working}
              style={{ background: '#141026' }}
            >
              {props.operation}
            </ActionButton>
          </Col>
        </RowBox>
        <Row align="middle" justify="center">
          <Typography>
            <Typography.Paragraph
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: 0 }}
            >
              <em>You may need to approve the transaction in Sollet.</em>
            </Typography.Paragraph>
          </Typography>
        </Row>
      </Modal>
    );
  },
);
export default DepositModal;
