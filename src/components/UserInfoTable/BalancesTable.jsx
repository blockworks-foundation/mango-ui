import { Button } from 'antd';
import React from 'react';
import { useAllMarkets } from '../../utils/markets';
import DataTable from '../layout/DataTable';
import { useSendConnection, useConnectionConfig } from '../../utils/connection';
import { useWallet } from '../../utils/wallet';
import { settleAll } from '../../utils/mango';
import { notify } from '../../utils/notifications';
import { useMarginAccount } from '../../utils/marginAccounts';

export default function BalancesTable({ balances, showMarket, hideWalletBalance }) {
  const connection = useSendConnection();
  const { wallet } = useWallet();
  const { mangoProgramId } = useConnectionConfig();
  const { marginAccount, mangoGroup } = useMarginAccount();
  const [marketList] = useAllMarkets();

  async function handleSettleAll() {
    const markets = (marketList || []).map((m) => m.market);

    try {
      await settleAll(connection, mangoProgramId, mangoGroup, marginAccount, markets, wallet);
      notify({
        message: 'Successfully settled funds',
        type: 'info',
      });
    } catch (e) {
      if (e.message === 'No unsettled funds') {
        notify({
          message: 'There are no unsettled funds',
          type: 'error',
        });
      } else {
        notify({
          message: 'Error settling funds',
          description: e.message,
          type: 'error',
        });
      }
    }
  }

  const columns = [
    showMarket
      ? {
          title: 'Market',
          dataIndex: 'marketName',
          key: 'marketName',
        }
      : null,
    {
      title: 'Coin',
      dataIndex: 'coin',
      key: 'coin',
    },
    hideWalletBalance
      ? null
      : {
          title: 'Wallet Balance',
          dataIndex: 'wallet',
          key: 'wallet',
        },
    {
      title: 'Deposits',
      dataIndex: 'marginDeposits',
      key: 'marginDeposits',
    },
    {
      title: 'Borrows',
      dataIndex: 'borrows',
      key: 'borrows',
    },
    {
      title: 'In Orders',
      dataIndex: 'orders',
      key: 'orders',
    },
    {
      title: 'Unsettled',
      dataIndex: 'unsettled',
      key: 'unsettled',
    },
    {
      title: 'Net',
      dataIndex: 'net',
      key: 'net',
    },
  ].filter((x) => x);
  return (
    <div>
      {marginAccount ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button
            ghost
            style={{ marginRight: '12px', padding: '0 36px' }}
            onClick={handleSettleAll}
          >
            Settle All
          </Button>
        </div>
      ) : null}
      <DataTable
        emptyLabel="No balances"
        dataSource={balances}
        columns={columns}
        pagination={false}
      />
    </div>
  );
}
