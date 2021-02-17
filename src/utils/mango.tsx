import { createAccountInstruction, uiToNative, zeroKey } from '@mango/client/lib/utils';
import {
  Account,
  Connection,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import Wallet from '@project-serum/sol-wallet-adapter';
import { MangoGroup, MarginAccount, MarginAccountLayout } from '@mango/client';
import { encodeMangoInstruction } from '@mango/client/lib/layout';
import { sendTransaction } from './send';
import { TOKEN_PROGRAM_ID } from './tokens';
import BN from 'bn.js';
import { Market, OpenOrders } from '@project-serum/serum';
import { Order } from '@project-serum/serum/lib/market';
import { SRM_DECIMALS } from '@project-serum/serum/lib/token-instructions';

export async function initMarginAccount(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  wallet: Wallet,

): Promise<PublicKey> {

  // Create a Solana account for the MarginAccount and allocate space
  const accInstr = await createAccountInstruction(connection,
    wallet.publicKey, MarginAccountLayout.span, programId)

  // Specify the accounts this instruction takes in (see program/src/instruction.rs)
  const keys = [
    { isSigner: false, isWritable: false, pubkey: mangoGroup.publicKey },
    { isSigner: false, isWritable: true, pubkey: accInstr.account.publicKey },
    { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_RENT_PUBKEY }
  ]

  // Encode and create instruction for actual initMarginAccount instruction
  const data = encodeMangoInstruction({ InitMarginAccount: {} })
  const initMarginAccountInstruction = new TransactionInstruction({ keys, data, programId })

  // Add all instructions to one atomic transaction
  const transaction = new Transaction()
  transaction.add(accInstr.instruction)
  transaction.add(initMarginAccountInstruction)

  // Specify signers in addition to the wallet
  const signers = [accInstr.account]

  const functionName = 'InitMarginAccount'
  const sendingMessage = `sending ${functionName} instruction...`
  const sentMessage = `${functionName} instruction sent`
  const successMessage = `${functionName} instruction success`

  await sendTransaction({
    transaction, wallet, signers, connection, sendingMessage, sentMessage, successMessage
  })

  return accInstr.account.publicKey
}

export async function deposit(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  wallet: Wallet,
  token: PublicKey,
  tokenAcc: PublicKey,

  quantity: number
): Promise<TransactionSignature> {
  const tokenIndex = mangoGroup.getTokenIndex(token)
  const nativeQuantity = uiToNative(quantity, mangoGroup.mintDecimals[tokenIndex])

  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: true, pubkey: tokenAcc },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.vaults[tokenIndex] },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY }
  ]
  const data = encodeMangoInstruction({ Deposit: { quantity: nativeQuantity } })


  const instruction = new TransactionInstruction({ keys, data, programId })

  const transaction = new Transaction()
  transaction.add(instruction)
  const signers = []

  const functionName = 'Deposit'
  const sendingMessage = `sending ${functionName} instruction...`
  const sentMessage = `${functionName} instruction sent`
  const successMessage = `${functionName} instruction success`
  return await sendTransaction({
    transaction, wallet, signers, connection, sendingMessage, sentMessage, successMessage
  })
}

export async function withdraw(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  wallet: Wallet,
  token: PublicKey,
  tokenAcc: PublicKey,

  quantity: number
): Promise<TransactionSignature> {
  const tokenIndex = mangoGroup.getTokenIndex(token)
  const nativeQuantity = uiToNative(quantity, mangoGroup.mintDecimals[tokenIndex])

  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: true, pubkey: tokenAcc },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.vaults[tokenIndex] },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    ...marginAccount.openOrders.map((pubkey) => ({ isSigner: false, isWritable: false, pubkey })),
    ...mangoGroup.oracles.map((pubkey) => ({ isSigner: false, isWritable: false, pubkey })),
  ]
  const data = encodeMangoInstruction({ Withdraw: { quantity: nativeQuantity } })
  const instruction = new TransactionInstruction({ keys, data, programId })
  const transaction = new Transaction()
  transaction.add(instruction)
  const signers = []
  const functionName = 'Withdraw'
  const sendingMessage = `sending ${functionName} instruction...`
  const sentMessage = `${functionName} instruction sent`
  const successMessage = `${functionName} instruction success`
  return await sendTransaction({
    transaction, wallet, signers, connection, sendingMessage, sentMessage, successMessage
  })
}

export async function borrow(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  wallet: Wallet,
  token: PublicKey,

  quantity: number
): Promise<TransactionSignature> {
  const tokenIndex = mangoGroup.getTokenIndex(token)
  const nativeQuantity = uiToNative(quantity, mangoGroup.mintDecimals[tokenIndex])

  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    ...marginAccount.openOrders.map((pubkey) => ({ isSigner: false, isWritable: false, pubkey })),
    ...mangoGroup.oracles.map((pubkey) => ({ isSigner: false, isWritable: false, pubkey })),
  ]
  const data = encodeMangoInstruction({ Borrow: { tokenIndex: new BN(tokenIndex), quantity: nativeQuantity } })


  const instruction = new TransactionInstruction({ keys, data, programId })

  const transaction = new Transaction()
  transaction.add(instruction)
  const signers = []
  const functionName = 'Borrow'
  const sendingMessage = `sending ${functionName} instruction...`
  const sentMessage = `${functionName} instruction sent`
  const successMessage = `${functionName} instruction success`
  return await sendTransaction({
    transaction, wallet, signers, connection, sendingMessage, sentMessage, successMessage
  })
}

export async function settleBorrow(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  wallet: Wallet,

  token: PublicKey,
  quantity: number
): Promise<TransactionSignature> {

  const tokenIndex = mangoGroup.getTokenIndex(token)
  const nativeQuantity = uiToNative(quantity, mangoGroup.mintDecimals[tokenIndex])

  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY }
  ]
  const data = encodeMangoInstruction({ SettleBorrow: { tokenIndex: new BN(tokenIndex), quantity: nativeQuantity } })
  const instruction = new TransactionInstruction({ keys, data, programId })

  const transaction = new Transaction()
  transaction.add(instruction)
  return await packageAndSend(transaction, connection, wallet, [],'SettleBorrow')
}

export async function depositSrm(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  wallet: Wallet,
  srmAccount: PublicKey,

  quantity: number
): Promise<TransactionSignature> {
  const nativeQuantity = uiToNative(quantity, SRM_DECIMALS)

  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false,  isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: true,  pubkey: srmAccount },
    { isSigner: false, isWritable: true,  pubkey: mangoGroup.srmVault },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY }
  ]
  const data = encodeMangoInstruction({DepositSrm: {quantity: nativeQuantity}})
  const instruction = new TransactionInstruction({ keys, data, programId })

  const transaction = new Transaction()
  transaction.add(instruction)
  return await packageAndSend(transaction, connection, wallet, [],'DepositSrm')
}

export async function withdrawSrm(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  wallet: Wallet,
  srmAccount: PublicKey,

  quantity: number
): Promise<TransactionSignature> {
  const nativeQuantity = uiToNative(quantity, SRM_DECIMALS)

  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: false,  isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: true,  pubkey: srmAccount },
    { isSigner: false, isWritable: true,  pubkey: mangoGroup.srmVault },
    { isSigner: false, isWritable: false,  pubkey: mangoGroup.signerKey },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY }
  ]
  const data = encodeMangoInstruction({WithdrawSrm: {quantity: nativeQuantity}})
  const instruction = new TransactionInstruction({ keys, data, programId })

  const transaction = new Transaction()
  transaction.add(instruction)
  return await packageAndSend(transaction, connection, wallet, [], 'WithdrawSrm')
}



export async function placeOrder(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  spotMarket: Market,
  wallet: Wallet,

  side: 'buy' | 'sell',
  price: number,
  size: number,
  orderType?: 'limit' | 'ioc' | 'postOnly',
  clientId?: BN,

): Promise<TransactionSignature> {
  orderType = orderType == undefined ? 'limit' : orderType
  // orderType = orderType ?? 'limit'
  const limitPrice = spotMarket.priceNumberToLots(price)
  const maxBaseQuantity = spotMarket.baseSizeNumberToLots(size)

  // TODO verify if multiplying by highest fee tier is appropriate
  const maxQuoteQuantity = new BN(spotMarket['_decoded'].quoteLotSize.toNumber()).mul(
    spotMarket.baseSizeNumberToLots(size * 1.0022).mul(spotMarket.priceNumberToLots(price)),
  )

  if (maxBaseQuantity.lte(new BN(0))) {
    throw new Error('size too small')
  }
  if (limitPrice.lte(new BN(0))) {
    throw new Error('invalid price')
  }
  const selfTradeBehavior = 'decrementTake'
  const marketIndex = mangoGroup.getMarketIndex(spotMarket)
  const vaultIndex = (side === 'buy') ? mangoGroup.vaults.length - 1 : marketIndex

  // Add all instructions to one atomic transaction
  const transaction = new Transaction()

  // Specify signers in addition to the wallet
  const signers: Account[] = []

  // Create a Solana account for the open orders account if it's missing
  const openOrdersKeys: PublicKey[] = [];
  for (let i = 0; i < marginAccount.openOrders.length; i++) {
    if (i === marketIndex && marginAccount.openOrders[marketIndex].equals(zeroKey)) {
      // open orders missing for this market; create a new one now
      const openOrdersSpace = OpenOrders.getLayout(mangoGroup.dexProgramId).span
      const openOrdersLamports = await connection.getMinimumBalanceForRentExemption(openOrdersSpace, 'singleGossip')
      const accInstr = await createAccountInstruction(
        connection, wallet.publicKey, openOrdersSpace, mangoGroup.dexProgramId, openOrdersLamports
      )

      transaction.add(accInstr.instruction)
      signers.push(accInstr.account)
      openOrdersKeys.push(accInstr.account.publicKey)
    } else {
      openOrdersKeys.push(marginAccount.openOrders[i])
    }
  }

  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey},
    { isSigner: true,  isWritable: false,  pubkey: wallet.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    { isSigner: false, isWritable: false, pubkey: spotMarket.programId },
    { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].requestQueue },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].eventQueue },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].bids },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].asks },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.vaults[vaultIndex] },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].baseVault },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].quoteVault },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_RENT_PUBKEY },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.srmVault },
    ...openOrdersKeys.map( (pubkey) => ( { isSigner: false, isWritable: true, pubkey })),
    ...mangoGroup.oracles.map( (pubkey) => ( { isSigner: false, isWritable: false, pubkey })),
  ]

  const data = encodeMangoInstruction(
    {
      PlaceOrder:
        clientId
          ? { side, limitPrice, maxBaseQuantity, maxQuoteQuantity, selfTradeBehavior, orderType, clientId}
          : { side, limitPrice, maxBaseQuantity, maxQuoteQuantity, selfTradeBehavior, orderType}
    }
  )

  const placeOrderInstruction = new TransactionInstruction( { keys, data, programId })
  transaction.add(placeOrderInstruction)

  return await packageAndSend(transaction, connection, wallet, signers, 'PlaceOrder')
}

export async function settleFunds(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  wallet: Wallet,
  spotMarket: Market,

): Promise<TransactionSignature> {

  const marketIndex = mangoGroup.getMarketIndex(spotMarket)
  const dexSigner = await PublicKey.createProgramAddress(
    [
      spotMarket.publicKey.toBuffer(),
      spotMarket['_decoded'].vaultSignerNonce.toArrayLike(Buffer, 'le', 8)
    ],
    spotMarket.programId
  )

  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey },
    { isSigner: true, isWritable: false, pubkey: wallet.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    { isSigner: false, isWritable: false, pubkey: spotMarket.programId },
    { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
    { isSigner: false, isWritable: true, pubkey: marginAccount.openOrders[marketIndex] },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].baseVault },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].quoteVault },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.vaults[marketIndex] },
    { isSigner: false, isWritable: true, pubkey: mangoGroup.vaults[mangoGroup.vaults.length - 1] },
    { isSigner: false, isWritable: false, pubkey: dexSigner },
    { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
  ]
  const data = encodeMangoInstruction({ SettleFunds: {} })

  const instruction = new TransactionInstruction({ keys, data, programId })

  // Add all instructions to one atomic transaction
  const transaction = new Transaction()
  transaction.add(instruction)

  const signers = []
  const functionName = 'SettleFunds'
  const sendingMessage = `sending ${functionName} instruction...`
  const sentMessage = `${functionName} instruction sent`
  const successMessage = `${functionName} instruction success`
  return await sendTransaction({
    transaction, wallet, signers, connection, sendingMessage, sentMessage, successMessage
  })
}

export async function cancelOrder(
  connection: Connection,
  programId: PublicKey,
  mangoGroup: MangoGroup,
  marginAccount: MarginAccount,
  wallet: Wallet,
  spotMarket: Market,
  order: Order,
): Promise<TransactionSignature> {
  const keys = [
    { isSigner: false, isWritable: true, pubkey: mangoGroup.publicKey},
    { isSigner: true, isWritable: false,  pubkey: wallet.publicKey },
    { isSigner: false,  isWritable: true, pubkey: marginAccount.publicKey },
    { isSigner: false, isWritable: false, pubkey: SYSVAR_CLOCK_PUBKEY },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.dexProgramId },
    { isSigner: false, isWritable: true, pubkey: spotMarket.publicKey },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].bids },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].asks },
    { isSigner: false, isWritable: true, pubkey: order.openOrdersAddress },
    { isSigner: false, isWritable: false, pubkey: mangoGroup.signerKey },
    { isSigner: false, isWritable: true, pubkey: spotMarket['_decoded'].eventQueue },
  ]

  const data = encodeMangoInstruction({
    CancelOrder: {
      side: order.side,
      orderId: order.orderId,
    }
  })


  const instruction = new TransactionInstruction( { keys, data, programId })

  const transaction = new Transaction()
  transaction.add(instruction)

  return await packageAndSend(transaction, connection, wallet, [], 'CancelOrder')

}

async function packageAndSend(

  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  signers: Account[],
  functionName: string
): Promise<TransactionSignature> {

  const sendingMessage = `sending ${functionName} instruction...`
  const sentMessage = `${functionName} instruction sent`
  const successMessage = `${functionName} instruction success`
  return await sendTransaction({
    transaction, wallet, signers, connection, sendingMessage, sentMessage, successMessage
  })
}