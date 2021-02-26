import React from 'react';
import { Helmet } from 'react-helmet';
import { useMarket, useMarkPrice } from '../utils/markets';

const AppTitle = () => {
  const markPrice = useMarkPrice();
  const { marketName } = useMarket();

  return (
    <Helmet>
      {markPrice && marketName ? (
        <title>
          ${`${markPrice}`} {marketName} &middot; Mango
        </title>
      ) : (
        <title>Mango Markets</title>
      )}
    </Helmet>
  );
};

export default AppTitle;
