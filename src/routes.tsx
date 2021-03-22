import { HashRouter, Route, Switch, Redirect } from 'react-router-dom';
import TradePage from './pages/TradePage';
import OpenOrdersPage from './pages/OpenOrdersPage';
import React from 'react';
import BalancesPage from './pages/BalancesPage';
import BasicLayout from './components/BasicLayout';
import StatsPage from './pages/StatsPage';
import { useDefaultMarket } from './utils/markets';

export function Routes() {
  const defaultMarket = useDefaultMarket();
  const defaultMarketUrl = `/market/${defaultMarket?.address?.toBase58() || ''}`;

  return (
    <>
      <HashRouter basename={'/'}>
        <BasicLayout>
          <Switch>
            <Route exact path="/">
              <Redirect to={defaultMarketUrl} />
            </Route>
            <Route exact path="/market/:marketAddress">
              <TradePage />
            </Route>
            <Route exact path="/orders" component={OpenOrdersPage} />
            <Route exact path="/balances" component={BalancesPage} />
            <Route exact path="/stats" component={StatsPage} />
          </Switch>
        </BasicLayout>
      </HashRouter>
    </>
  );
}
