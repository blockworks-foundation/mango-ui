import React from 'react';
// Get our currency input component
import { CurrencyInput } from '../CurrencyInput';
// Components from antd
import { Modal, Col } from 'antd';
// Styled components
import { RowBox, GreenButton } from '../componentStyles';
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
      customTokenAccounts: any;
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
            customTokenAccounts={props.customTokenAccounts}
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
          customTokenAccounts={props.customTokenAccounts}
          ref={ref}
        />
        <RowBox align="middle" justify="center">
          <Col span={8}>
            <GreenButton block size="middle" onClick={props.handleClick} loading={props.working}>
              {props.operation}
            </GreenButton>
          </Col>
        </RowBox>
      </Modal>
    );
  },
);
export default DepositModal;
