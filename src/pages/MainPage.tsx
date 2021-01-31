import React, { useEffect, useState } from 'react';

import { useConnection, useConnectionConfig } from '../utils/connection';
import { useWallet } from '../utils/wallet';

import { MangoClient, IDS, MangoGroup, MarginAccount } from '@mango/client';
import { PublicKey } from '@solana/web3.js';

export default function MainPage() {

  const connection = useConnection();
  const { endpoint } = useConnectionConfig();

  const client = new MangoClient()
  const { wallet, connected } = useWallet();
  const [mangoGroup, setMangoGroup] = useState<MangoGroup | undefined>(undefined);


  const mangoGroupIds = IDS[endpoint].mangoGroups[0]  // TODO allow selection of mango group with drop down
  const mangoGroupPk = new PublicKey(mangoGroupIds.mangoGroupPk)

  async function fetchMangoGroup() {
    let result = await client.getMangoGroup(connection, mangoGroupPk);
    setMangoGroup(result)
  }

  // load mango goup, whenever connection changes
  useEffect(() => {
    fetchMangoGroup();
  }, [connection]);


  const [marginAccounts, setMarginAccounts] = useState<MarginAccount[]>([]);

  async function fetchMarginAccounts() {
    if (mangoGroup !== undefined) {
      let result = await client.getMarginAccountsForOwner(
        connection,
        new PublicKey(IDS[endpoint].mango_program_id),
        mangoGroup,
        wallet,
      )
      setMarginAccounts(result)
    }

  }

  // refresh margin accounts, if mango group changes
  useEffect(() => {
    if (connected) {
      fetchMarginAccounts();
    } else {
      setMarginAccounts([]);
    }
  }, [mangoGroup, wallet, connected]);

  return (
    <>
      Select the margin account:

      { marginAccounts.map(a =>
        <><p> {a.owner.toString()} </p></>
      ) }
    </>
  );
}
