import React, { useEffect, useState } from 'react';

import { ENDPOINTS, useConnection, useConnectionConfig } from '../utils/connection';
import { useWallet } from '../utils/wallet';

import { MangoClient, IDS, MangoGroup, MarginAccount } from '@blockworks-foundation/mango-client';
import { PublicKey } from '@solana/web3.js';
import { zeroKey } from '@blockworks-foundation/mango-client/lib/utils';
import { DEFAULT_MANGO_GROUP } from '../utils/mango';

function MarginAccountList() {
  const connection = useConnection();
  const { endpoint, endpointInfo } = useConnectionConfig();

  const client = new MangoClient();
  const { wallet, connected } = useWallet();
  const [mangoGroup, setMangoGroup] = useState<MangoGroup | undefined>(undefined);

  const mangoGroupIds = IDS[endpointInfo!.name].mango_groups[DEFAULT_MANGO_GROUP]; // TODO allow selection of mango group with drop down
  const mangoGroupPk = new PublicKey(mangoGroupIds.mango_group_pk);

  async function fetchMangoGroup() {
    let result = await client.getMangoGroup(connection, mangoGroupPk);
    result.tokens.forEach((t, i) => console.log('Token ', i, t.toBase58()));
    console.log('Mango group is ', result);
    setMangoGroup(result);
  }

  // load mango goup, whenever connection changes
  useEffect(() => {
    fetchMangoGroup();
  }, [connection, endpointInfo]);

  const [marginAccounts, setMarginAccounts] = useState<MarginAccount[]>([]);

  const values: number[] = new Array(3);
  async function fetchMarginAccounts() {
    if (mangoGroup !== undefined) {
      let result = await client.getMarginAccountsForOwner(
        connection,
        new PublicKey(IDS[endpointInfo!.name].mango_program_id),
        mangoGroup,
        wallet,
      );

      for (const [i, ma] of result.entries()) {
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
      {marginAccounts.map((ma, i) => {
        console.log(ma);
        return (
          <>
            <p>
              {' '}
              {ma.publicKey.toBase58()} {values[i]}{' '}
            </p>
          </>
        );
      })}
    </>
  );
}

export default function MainPage() {
  const connection = useConnection();
  const { endpoint, endpointInfo } = useConnectionConfig();

  if (IDS[endpointInfo!.name] === undefined) {
    return (
      <>Endpoint {endpointInfo!.name} does not yet have a valid mango markets contract deployed</>
    );
  } else {
    return <MarginAccountList />;
  }
}
