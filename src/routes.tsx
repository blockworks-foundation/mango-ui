import { HashRouter, Route, Switch, Redirect } from 'react-router-dom';
import TradePage from './pages/TradePage';
import React from 'react';
import BasicLayout from './components/BasicLayout';
import StatsPage from './pages/StatsPage';
import AlertPage from './pages/AlertPage';
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
            <Route exact path="/stats" component={StatsPage} />
            <Route exact path="/alerts" component={AlertPage} />
          </Switch>
        </BasicLayout>
      </HashRouter>
    </>
  );
}
