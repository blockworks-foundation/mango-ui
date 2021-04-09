import { Button, Input, Modal, Radio, Switch, Select, Slider, Divider } from 'antd';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import ReactSlider from 'react-slider';
import styled from 'styled-components';
import { PublicKey } from '@solana/web3.js';
import { IDS } from '@blockworks-foundation/mango-client';
import { useWallet } from '../utils/wallet';
import { notify } from '../utils/notifications';
import { useSendConnection, useConnection, useConnectionConfig } from '../utils/connection';
import { useIpAddress } from '../utils/useIpAddress';
import FloatingElement from './layout/FloatingElement';
import { SwitchChangeEventHandler } from 'antd/es/switch';
import tuple from 'immutable-tuple';
import { useMarginAccount } from '../utils/marginAccounts';
import TelegramModal from './TelegramModal';
import { NUM_TOKENS } from '@blockworks-foundation/mango-client/lib/layout';
import { MangoClient } from '@blockworks-foundation/mango-client';


import CountryPhoneInput, { CountryPhoneInputValue } from 'antd-country-phone-input';
import 'antd-country-phone-input/dist/index.css';
import 'flagpack/dist/flagpack.css';

const BuyButton = styled(Button)`
  margin: 20px 0px 0px 0px;
  color: #141026;
  background: #9bd104;
  border-color: #9bd104;
`;

interface MarginInfo {
  leverage: number;
  prices: number[];
  equity: number;
  liabsVal: number;
  assetsVal: number;
  deposits: number[];
  borrows: number[];
}

const { Option, OptGroup } = Select;

function MarginAccountSelector({ marginAccountsWithGroups, placeholder, marginAccountWithGroup, setMarginAccountWithGroup }) {
  const onSetMarginAccountWithGroup = (selectedMarginAccountWithGroupValue:string) => {
    const [mangoGroupPk, marginAccountPk] = selectedMarginAccountWithGroupValue.split('_');
    const marginAccountWithGroup = marginAccountsWithGroups
      .find((proposedMarginAccountWithGroup) =>
        proposedMarginAccountWithGroup.marginAccount.mangoGroup.equals(new PublicKey(mangoGroupPk)) &&
        proposedMarginAccountWithGroup.marginAccount.publicKey.equals(new PublicKey(marginAccountPk)));
    setMarginAccountWithGroup(marginAccountWithGroup);
  };
  const selectedMarginAccountWithGroup = marginAccountsWithGroups
    .find((proposedMarginAccountWithGroup) =>
      marginAccountWithGroup?.marginAccount &&
      proposedMarginAccountWithGroup.marginAccount.mangoGroup.equals(marginAccountWithGroup.marginAccount.mangoGroup) &&
      proposedMarginAccountWithGroup.marginAccount.publicKey.equals(marginAccountWithGroup.marginAccount.publicKey));
  const selectedMarginAccountWithGroupValue = selectedMarginAccountWithGroup ?
    `${selectedMarginAccountWithGroup.marginAccount.mangoGroup.toBase58()}_${selectedMarginAccountWithGroup.marginAccount.publicKey.toBase58()}`: undefined;

  return (
    <Select
      showSearch
      size={'large'}
      style={{ width: '100%' }}
      placeholder={placeholder || 'Select a margin account'}
      optionFilterProp="name"
      onSelect={onSetMarginAccountWithGroup}
      listHeight={400}
      value={selectedMarginAccountWithGroupValue}
      filterOption={(input, option) =>
        option?.name?.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
    >
      <OptGroup label="Margin Accounts">
        {marginAccountsWithGroups
          .map(({mangoGroup, marginAccount, equity}, i) => (
            <Option
              value={`${marginAccount.mangoGroup.toBase58()}_${marginAccount.publicKey.toBase58()}`}
              key={`${marginAccount.mangoGroup.toBase58()}_${marginAccount.publicKey.toBase58()}`}
              name={Object.keys(mangoGroup.symbols).join('_')}
              style={{
                padding: '10px',
                // @ts-ignore
                backgroundColor: i % 2 === 0 ? 'rgb(39, 44, 61)' : null,
              }}
            >
              {`${Object.keys(mangoGroup.symbols).join('/')}__${equity.toFixed(2)}`}
            </Option>
          ))}
      </OptGroup>
    </Select>
  );
}

export default function AlertForm({
  style,
}: {
  style?: any;
}) {
  const { wallet, connected } = useWallet();
  const sendConnection = useSendConnection();

  const connection = useConnection();
  const { marginAccount, marginAccountWithGroup, setMarginAccountWithGroup, marginAccountsWithGroups, setMarginAccountsWithGroups, getAllMarginAccountsForAllGroups, mangoGroup } = useMarginAccount();

  const [collateralRatioThresh, setCollateralRatioThresh] = useState(113);
  const [alertProvider, setAlertProvider] = useState('sms');
  const [phoneNumber, setPhoneNumber] = useState<CountryPhoneInputValue>({ short: 'US' });
  const [email, setEmail] = useState<string>('');
  const [tgCode, setTgCode] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);
  const [marginInfo, setMarginInfo] = useState<MarginInfo>({
    leverage: 0,
    prices: [],
    equity: 0,
    liabsVal: 0,
    deposits: [],
    assetsVal: 0,
    borrows: [],
  });

  const resetForm = () => {
    setAlertProvider('sms');
    setPhoneNumber({ short: 'US' });
    setEmail('');
    setTgCode('');
    setCollateralRatioThresh(113);
    setMarginAccountWithGroup(null);
  }

  useEffect(() => {
    const calculateAccountMarginInfo = async () => {
      if (!mangoGroup || !marginAccount) return;

      const prices = await mangoGroup.getPrices(connection);
      const equity = marginAccount.computeValue(mangoGroup, prices);
      const leverage = equity ? 1 / (marginAccount.getCollateralRatio(mangoGroup, prices) - 1) : 0;
      const liabsVal = marginAccount.getLiabsVal(mangoGroup, prices);
      const assetsVal = marginAccount.getAssetsVal(mangoGroup, prices);
      const deposits = marginAccount.getDeposits(mangoGroup);
      const borrows = marginAccount.getLiabs(mangoGroup);

      setMarginInfo((prevMarginInfo) => ({
        ...prevMarginInfo,
        leverage,
        prices,
        equity,
        liabsVal,
        deposits,
        assetsVal,
        borrows,
      }));
    };
    calculateAccountMarginInfo();
  }, [connection, mangoGroup, marginAccount]);

  useEffect(() => {
    if (connected) {
      getAllMarginAccountsForAllGroups().then((marginAccountsWithGroups) => {
        setMarginAccountsWithGroups(marginAccountsWithGroups);
      });
    }
  }, [connected]);

  async function onSubmit() {
    if (!connected) {
      notify({
        message: 'Please connect wallet',
        type: 'error',
      });
      return;
    } else if (!marginAccountWithGroup) {
      notify({
        message: 'Please select a margin account',
        type: 'error',
      });
      return;
    } else if (alertProvider === 'sms' && !phoneNumber.phone) {
      notify({
        message: 'Please provide phone number',
        type: 'error',
      });
      return;
    } else if (alertProvider === 'mail' && !email) {
      notify({
        message: 'Please provide e-mail',
        type: 'error',
      });
      return;
    }
    setSubmitting(true);
    const fetchUrl = `http://localhost:3010/alerts`;
    const body = {
      mangoGroupPk: marginAccountWithGroup.marginAccount?.mangoGroup.toString(),
      marginAccountPk: marginAccountWithGroup.marginAccount?.publicKey.toString(),
      collateralRatioThresh,
      alertProvider,
      phoneNumber,
      email
    };
    const headers = { 'Content-Type':'application/json' };
    fetch(fetchUrl, { method: 'POST', headers: headers, body: JSON.stringify(body)})
      .then((response: any) => {
        setSubmitting(false);
        if (!response.ok) { throw response }
        return response.json();
      })
      .then((json: any) => {
        if (alertProvider === 'tg') {
          setTgCode(json.code);
        } else {
          notify({
            message: 'You have succesfully saved your alert',
            type: 'success',
          });
          resetForm();
        }
      }).catch(err => {
        err.text().then((errorMessage: string) => {
          notify({
            message: errorMessage,
            type: 'error',
          });
        })
      });
  }

  return (
    <>
      <FloatingElement style={{ height: '100%', display: 'flex', flexDirection: 'column', ...style }}>
        <div>
          <Divider>Margin Account</Divider>
          <MarginAccountSelector
            marginAccountsWithGroups={marginAccountsWithGroups}
            placeholder={'Select margin account'}
            marginAccountWithGroup={marginAccountWithGroup}
            setMarginAccountWithGroup={setMarginAccountWithGroup}
          />
          <Divider>Liquidation Alert</Divider>
          <Input.Group compact style={{ paddingBottom: 8 }}>
            <Input
              style={{ width: '100%', textAlign: 'right', paddingBottom: 8 }}
              addonBefore={<div style={{ width: '30px' }}>Ratio</div>}
              suffix={<span style={{ fontSize: 10, opacity: 0.5 }}>%</span>}
              value={collateralRatioThresh}
              type="number"
              step = "0.1"
              onChange={(e) => setCollateralRatioThresh(parseFloat(e.target.value))}
            />
          </Input.Group>
          <Radio.Group
            onChange={(e) => setAlertProvider(e.target.value)}
            value={alertProvider}
            buttonStyle="solid"
            style={{
              marginBottom: 16,
              width: '100%',
            }}
          >
            <Radio.Button
              value="sms"
              style={{
                width: '33.3%',
                textAlign: 'center',
              }}
            >
              SMS
            </Radio.Button>
            <Radio.Button
              value="mail"
              style={{
                width: '33.3%',
                textAlign: 'center',
              }}
            >
              E-MAIL
            </Radio.Button>
            <Radio.Button
              value="tg"
              style={{
                width: '33.3%',
                textAlign: 'center',
              }}
            >
              TELEGRAM
            </Radio.Button>
          </Radio.Group>
          { (alertProvider === 'sms') && (
            <CountryPhoneInput
              value={phoneNumber}
              onChange={(v) => {
                setPhoneNumber(v);
              }}
            />
          ) }
          { (alertProvider === 'mail') && (
            <Input.Group compact style={{ paddingBottom: 8 }}>
              <Input
                style={{ width: '100%', paddingBottom: 8 }}
                addonBefore={<div style={{ width: '40px' }}>E-mail</div>}
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Input.Group>
          ) }
          { (alertProvider === 'tg') && (
            <>
            <p>Instructions</p>
            <ol>
              <li>Connect wallet</li>
              <li>Click the Save alert button</li>
              <li>Follow instructions in the dialog</li>
            </ol>
            </>
          ) }
        </div>
        <BuyButton
          disabled={!connected || (alertProvider === 'mail' && !email) || (alertProvider === 'sms' && !phoneNumber.phone )}
          onClick={onSubmit}
          block
          type="primary"
          size="large"
          loading={submitting}
        >
          {connected ? 'Save Alert' : 'CONNECT WALLET TO SAVE'}
        </BuyButton>
      </FloatingElement>
      {tgCode !== '' ? (
        <TelegramModal
          visible={tgCode !== ''}
          tgCode={tgCode}
          onCancel={() => setTgCode('')}
          onOk={() => resetForm()}
        />
      ) : null}
    </>
  );
}
