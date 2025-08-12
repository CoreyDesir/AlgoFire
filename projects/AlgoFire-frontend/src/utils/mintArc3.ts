import * as algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from './network/getAlgoClientConfigs'

async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(digest)
}

export async function mintArc3Nft(params: {
  creator: string
  unitName: string
  assetName: string
  metadataUrl: string
  metadataJsonBytes?: Uint8Array
  manager?: string | undefined
  reserve?: string | undefined
  freeze?: string | undefined
  clawback?: string | undefined
  note?: Uint8Array
  transactionSigner: algosdk.TransactionSigner
}) {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig })

  const metadataHash =
    params.metadataJsonBytes && params.metadataJsonBytes.length > 0
      ? await sha256Bytes(params.metadataJsonBytes)
      : undefined

  const result = await algorand.send.assetCreate({
    sender: params.creator,
    signer: params.transactionSigner,
    total: 1,
    decimals: 0,
    defaultFrozen: false,
    unitName: params.unitName,
    assetName: params.assetName,
    url: params.metadataUrl,
    metadataHash,
    manager: params.manager,
    reserve: params.reserve,
    freeze: params.freeze,
    clawback: params.clawback,
    note: params.note,
  } as any)
  const txId = Array.isArray((result as any).txIds) ? (result as any).txIds[0] : (result as any).txId
  return txId as string
}


