import React, { useEffect, useState } from 'react';

import { ENDPOINTS, useConnection, useConnectionConfig } from '../utils/connection';
import { useWallet } from '../utils/wallet';

import { MangoClient, IDS, MangoGroup, MarginAccount } from '@mango/client';
import { PublicKey } from '@solana/web3.js';
import { zeroKey } from '@mango/client/lib/utils';



function MarginAccountList() {

  const connection = useConnection();
  const { endpoint, endpointInfo } = useConnectionConfig();

  const client = new MangoClient();
  const { wallet, connected } = useWallet();
  const [mangoGroup, setMangoGroup] = useState<MangoGroup | undefined>(undefined);

  const mangoGroupIds = IDS[endpointInfo!.name].mango_groups.BTC_ETH_USDC; // TODO allow selection of mango group with drop down
  const mangoGroupPk = new PublicKey(mangoGroupIds.mango_group_pk);

  async function fetchMangoGroup() {
    let result = await client.getMangoGroup(connection, mangoGroupPk);
    setMangoGroup(result);
  }

  // load mango goup, whenever connection changes
  useEffect(() => {
    fetchMangoGroup();
  }, [connection, endpointInfo]);


  const [marginAccounts, setMarginAccounts] = useState<MarginAccount[]>([]);

  const values: number[] = new Array(3)
  async function fetchMarginAccounts() {
    if (mangoGroup !== undefined) {
      let result = await client.getMarginAccountsForOwner(
        connection,
        new PublicKey(IDS[endpointInfo!.name].mango_program_id),
        mangoGroup,
        wallet,
      );

      for (const [i, ma] of result.entries()) {
        ma.openOrdersAccounts = await ma.loadOpenOrders(connection, new PublicKey(IDS[endpointInfo!.name].dex_program_id));
        values[i] = await ma.getValue(connection, mangoGroup);
        console.log(values[i]);
      }

      setMarginAccounts(result);
    }

  }

  // refresh margin accounts, if mango group changes
  useEffect(() => {
    if (connected) {
      fetchMarginAccounts();
    } else {
      setMarginAccounts([]);
    }
  }, [mangoGroup, wallet, connected, connection]);

  return (
    <>
      Select the margin account:

      { marginAccounts.map((ma, i) =>
        <><p> {ma.publicKey.toBase58()} {values[i]} </p></>
      ) }
    </>
  );

}






export default function MainPage() {

  const connection = useConnection();
  const { endpoint, endpointInfo } = useConnectionConfig();

  if (IDS[endpointInfo!.name] === undefined) {
    return (
      <>
        Endpoint {endpointInfo!.name} does not yet have a valid mango markets contract deployed
      </>);
  } else {
    return (<MarginAccountList />)
  }
}
