import React, { useMemo } from 'react';
import { Dropdown, Menu, Typography } from 'antd';
import { WalletFilled } from '@ant-design/icons';
import { ActionButton } from '../components/mango/componentStyles/';
import { useWallet } from '../utils/wallet';

const { Text } = Typography;

export default function WalletConnect() {
  const { connected, wallet } = useWallet();
  const publicKey = wallet?.publicKey?.toBase58();
  // Build menu items
  const menu = useMemo(() =>
    <Menu>
      <Menu.Item onClick={wallet.disconnect}>
        Disconnect
      </Menu.Item>
    </Menu>
    , [wallet]);

  return (
    <React.Fragment>
      {!connected ?
        <ActionButton
          size="large"
          onClick={wallet.connect}
          style={{ color: '#2abdd2' }}
        >
          {!connected ? 'Connect wallet' : 'Disconnect'}
        </ActionButton>
        :
        <Dropdown
          overlay={menu}
          placement="topCenter"
        >
          <ActionButton
            size="large"
            style={{ borderColor: 'green' }}
          >
            <WalletFilled style={{ color: 'green' }} />
            <Text code>
              {publicKey.toString().substr(0, 4) + '...' + publicKey.toString().substr(-4)}
            </Text>
          </ActionButton>
        </Dropdown>
      }
    </React.Fragment>
  );
}
