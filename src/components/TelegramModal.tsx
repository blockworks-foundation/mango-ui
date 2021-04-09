import React, { useEffect } from 'react';
import { Card, Modal } from 'antd';

export default function TelegramModal (props, ref) {
  const {
    visible,
    tgCode,
    onCancel,
    onOk,
  } = props;
  return (
    <Modal
      title={
        <p>
          Claim alert in Telegram
        </p>
      }
      visible={visible}
      onCancel={onCancel}
      onOk={onOk}
    >
      <Card className="ccy-input" style={{ borderRadius: 20 }} bodyStyle={{ padding: 0 }}>
        <div style={{padding: '20px 10px'}}>
          <ol style={{marginBottom: 0}}>
            <li>Please copy this code - <span style={{fontWeight: 900, fontStyle: 'italic'}}>{tgCode}</span></li>
            <li>Visit this telegram channel - <a target="_blank" rel="noopener noreferrer" href="https://t.me/mango_alerts_bot">https://t.me/mango_alerts_bot</a></li>
            <li>Paste the code and send</li>
            <li>This alert can be claimed within 15 minutes</li>
          </ol>
        </div>
      </Card>
    </Modal>
  );
}
