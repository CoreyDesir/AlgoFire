import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import * as algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface TransactInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const Transact = ({ openModal, setModalState }: TransactInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [receiverAddress, setReceiverAddress] = useState<string>('')
  const [resolving, setResolving] = useState<boolean>(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig })

  const { enqueueSnackbar } = useSnackbar()

  const { transactionSigner, activeAddress } = useWallet()

  // Derive helper values on each render
  const inputValue = receiverAddress.trim()
  const inputLooksLikeNfd = /^(?:@)?[a-z0-9-_.]+\.algo$/i.test(inputValue)
  const nfdName = inputLooksLikeNfd ? inputValue.replace(/^@/, '') : null
  const storedNetwork = ((typeof window !== 'undefined' && window.localStorage.getItem('af-network')) || '').toLowerCase()
  const explorerBase =
    storedNetwork === 'mainnet' ? 'https://explorer.perawallet.app/address' : 'https://testnet.explorer.perawallet.app/address'

  const handleSubmitAlgo = async () => {
    setLoading(true)

    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }

    try {
      enqueueSnackbar('Sending transaction...', { variant: 'info' })
      const finalReceiver = resolvedAddress ?? receiverAddress
      if (!finalReceiver || !algosdk.isValidAddress(finalReceiver)) {
        enqueueSnackbar('Please provide a valid address or resolvable NFD domain', { variant: 'warning' })
        setLoading(false)
        return
      }
      const result = await algorand.send.payment({
        signer: transactionSigner,
        sender: activeAddress,
        receiver: finalReceiver,
        amount: algo(1),
      })
      enqueueSnackbar(`Transaction sent: ${result.txIds[0]}`, { variant: 'success' })
      setReceiverAddress('')
      setResolvedAddress(null)
    } catch (e) {
      enqueueSnackbar('Failed to send transaction', { variant: 'error' })
    }

    setLoading(false)
  }

  const isLikelyNfd = (value: string) => /^(?:@)?[a-z0-9-_.]+\.algo$/i.test(value.trim())

  const tryFetchJson = async (url: string) => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as unknown
  }

  const extractAlgorandAddress = (data: unknown): string | null => {
    try {
      // Common fields from NFD API responses
      const obj: any = data as any
      const candidates: Array<string | undefined> = [obj?.depositAccount, obj?.owner?.address, obj?.address, obj?.addresses?.algo]
      for (const cand of candidates) {
        if (typeof cand === 'string' && algosdk.isValidAddress(cand)) return cand
      }
      // Some lookup endpoints return arrays or keyed objects
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = extractAlgorandAddress(item)
          if (found) return found
        }
      } else if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          const val = (obj as any)[key]
          const found = extractAlgorandAddress(val)
          if (found) return found
        }
      }
      // Ultimate fallback: scan for Base32 address in JSON string
      const text = JSON.stringify(data)
      const match = text.match(/[A-Z2-7]{58}/)
      if (match && algosdk.isValidAddress(match[0])) return match[0]
    } catch {}
    return null
  }

  const resolveNfdToAddress = async (rawName: string): Promise<string | null> => {
    const name = rawName.replace(/^@/, '')
    const candidates = [
      // Official lookup/resolve variants
      `https://api.nf.domains/nfd/lookup?name=${encodeURIComponent(name)}&view=full&allow_unverified=true`,
      `https://api.nf.domains/nfd/lookup?name=${encodeURIComponent(name)}&view=tiny&allow_unverified=true`,
      `https://api.nf.domains/nfd/resolve/${encodeURIComponent(name)}`,
      `https://api.nf.domains/nfd/resolve?name=${encodeURIComponent(name)}`,
      `https://api.nf.domains/nfd/${encodeURIComponent(name)}`,
      // Search variant (pattern)
      `https://api.nf.domains/nfd/lookup?pattern=${encodeURIComponent(name)}&view=tiny`,
    ]
    for (const url of candidates) {
      try {
        const json = await tryFetchJson(url)
        const addr = extractAlgorandAddress(json)
        if (addr) return addr
      } catch {
        // try next endpoint
      }
    }
    return null
  }

  // Debounced resolve when the input looks like an NFD
  useEffect(() => {
    let timeout: number | undefined
    setResolveError(null)
    setResolvedAddress(null)
    if (isLikelyNfd(receiverAddress)) {
      setResolving(true)
      timeout = window.setTimeout(async () => {
        const addr = await resolveNfdToAddress(receiverAddress.trim())
        if (addr) {
          setResolvedAddress(addr)
          setResolveError(null)
        } else {
          setResolvedAddress(null)
          setResolveError('Domain not found')
        }
        setResolving(false)
      }, 500)
    } else {
      setResolving(false)
    }
    return () => {
      if (timeout) window.clearTimeout(timeout)
    }
  }, [receiverAddress])

  return (
    <dialog id="transact_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`}>
      <form method="dialog" className="modal-box relative">
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          title="Close"
          onClick={() => setModalState(false)}
        >
          ✕
        </button>
        <h3 className="font-bold text-lg">Send payment transaction</h3>
        <br />
        <input
          type="text"
          data-test-id="receiver-address"
          placeholder="Provide wallet address or NFD (.algo)"
          className="input input-bordered w-full"
          value={receiverAddress}
          onChange={(e) => {
            setReceiverAddress(e.target.value)
          }}
        />
        {/* Resolution status / result */}
        {isLikelyNfd(receiverAddress) && (
          <div className="mt-2 text-xs text-gray-600">
            {resolving && <span className="loading loading-spinner loading-xs mr-1" />}
            {!resolving && resolvedAddress && (
              <div>
                <div className="font-semibold text-gray-700">
                  Resolved Address
                  {nfdName && (
                    <a
                      className="ml-2 text-teal-700 hover:underline"
                      href={`https://app.nf.domains/name/${nfdName}`}
                      target="_blank"
                      rel="noreferrer"
                      title={`Open ${nfdName} on nf.domains`}
                    >
                      (nf.domains)
                    </a>
                  )}
                </div>
                <a
                  className="break-all block mt-1 text-teal-700 hover:underline"
                  href={`${explorerBase}/${resolvedAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in block explorer"
                >
                  {resolvedAddress}
                </a>
              </div>
            )}
            {!resolving && !resolvedAddress && resolveError && <span className="text-red-600">{resolveError}</span>}
          </div>
        )}
        <div className="modal-action ">
          <button className="btn" onClick={() => setModalState(!openModal)}>
            Close
          </button>
          <button
            data-test-id="send-algo"
            className={`btn ${resolvedAddress || receiverAddress.length === 58 ? '' : 'btn-disabled'} lo`}
            onClick={handleSubmitAlgo}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Send 1 Algo'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default Transact
