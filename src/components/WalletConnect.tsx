import React from 'react';
import { Popover } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ActionButton } from '../components/mango/componentStyles/';
import { useWallet } from '../utils/wallet';
import LinkAddress from './LinkAddress';

export default function WalletConnect() {
  const { connected, wallet } = useWallet();
  const publicKey = wallet?.publicKey?.toBase58();

  return (
    <React.Fragment>
      <ActionButton
        type="text"
        size="large"
        onClick={connected ? wallet.disconnect : wallet.connect}
        style={{ color: '#2abdd2' }}
      >
        {!connected ? 'Connect wallet' : 'Disconnect'}
      </ActionButton>
      {connected && (
        <Popover
          content={<LinkAddress address={publicKey} />}
          placement="bottomRight"
          title="Wallet public key"
          trigger="click"
        >
          <InfoCircleOutlined style={{ color: '#2abdd2' }} />
        </Popover>
      )}
    </React.Fragment>
  );
}
