import { Button } from 'antd';
import React from 'react';
import { useMarket, useTokenAccounts, getSelectedTokenAccountForMint } from '../../utils/markets';
import DataTable from '../layout/DataTable';
import { useSendConnection, useConnectionConfig } from '../../utils/connection';
import { useWallet } from '../../utils/wallet';
import { settleFunds, settleFundsAndBorrows } from '../../utils/mango';
import { notify } from '../../utils/notifications';
import { useMarginAccount } from '../../utils/marginAccounts';

export default function BalancesTable({
  balances,
  showMarket,
  hideWalletBalance,
  onSettleSuccess,
}) {
  const connection = useSendConnection();
  const { wallet } = useWallet();
  const { mangoProgramId } = useConnectionConfig();
  const { marginAccount, mangoGroup } = useMarginAccount();

  async function onSettleFunds(market, openOrders) {
    try {
      await settleFundsAndBorrows(
        connection,
        mangoProgramId,
        mangoGroup,
        marginAccount,
        wallet,
        market,
      );
    } catch (e) {
      notify({
        message: 'Error settling funds',
        description: e.message,
        type: 'error',
      });
      return;
    }
    onSettleSuccess && onSettleSuccess();
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
      title: 'Margin Deposits',
      dataIndex: 'marginDeposits',
      key: 'marginDeposits',
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
      key: 'action',
      render: ({ market, openOrders, marketName }) => (
        <div style={{ textAlign: 'right' }}>
          <Button
            ghost
            style={{ marginRight: 12 }}
            onClick={() => onSettleFunds(market, openOrders)}
          >
            Settle {marketName}
          </Button>
        </div>
      ),
    },
  ].filter((x) => x);
  return (
    <DataTable
      emptyLabel="No balances"
      dataSource={balances}
      columns={columns}
      pagination={false}
    />
  );
}
