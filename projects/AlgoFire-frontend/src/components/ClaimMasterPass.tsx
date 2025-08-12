import React from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { uploadFileToIpfs, uploadJsonToIpfs } from '../utils/ipfs'
import { mintArc3Nft } from '../utils/mintArc3'

interface ClaimMasterPassProps {
  openModal: boolean
  setModalState: (value: boolean) => void
  onClaimed: (args: { imageCid: string; metadataCid: string; txId: string }) => void
}

const DEFAULT_IMAGE_PATH = '/blockchain.png'

const ClaimMasterPass: React.FC<ClaimMasterPassProps> = ({ openModal, setModalState, onClaimed }) => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const [loading, setLoading] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  // Try to load default image when modal opens
  React.useEffect(() => {
    let revoked: string | null = null
    const loadDefault = async () => {
      try {
        const res = await fetch(DEFAULT_IMAGE_PATH, { cache: 'no-store' })
        if (!res.ok) return
        const blob = await res.blob()
        const type = blob.type || 'image/png'
        const f = new File([blob], 'blockchain.png', { type })
        setFile(f)
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        revoked = url
      } catch {
        // ignore - user can choose a file
      }
    }
    if (openModal) loadDefault()
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [openModal])

  const onSelectFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files && e.target.files[0]
    if (f) {
      setFile(f)
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
    }
  }

  const handleMint = async () => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Connect your wallet first', { variant: 'warning' })
      return
    }
    if (!file) {
      enqueueSnackbar('No image to mint. Select a file.', { variant: 'warning' })
      return
    }
    setLoading(true)
    try {
      // 1) Upload image
      const { cid: imageCid } = await uploadFileToIpfs(file)

      // 2) Upload ARC-3 metadata
      const metadata = {
        name: 'MasterPass',
        description: 'Your MasterPass NFT',
        image: `ipfs://${imageCid}`,
        image_mimetype: file.type || 'image/png',
        properties: { kind: 'MasterPass' },
      }
      const { cid: metadataCid, bytes } = await uploadJsonToIpfs(metadata)
      const metadataUrl = `ipfs://${metadataCid}`

      // 3) Mint ASA (ARC-3)
      const txId = await mintArc3Nft({
        creator: activeAddress,
        unitName: 'MPASS',
        assetName: 'MasterPass',
        metadataUrl,
        metadataJsonBytes: bytes,
        transactionSigner,
      })

      const storedNetwork = ((typeof window !== 'undefined' && window.localStorage.getItem('af-network')) || '').toLowerCase()
      const txExplorerBase = storedNetwork === 'mainnet' ? 'https://explorer.perawallet.app/tx' : 'https://testnet.explorer.perawallet.app/tx'

      enqueueSnackbar(
        <span>
          MasterPass minted! Tx:{' '}
          <a className="underline" href={`${txExplorerBase}/${txId}`} target="_blank" rel="noreferrer">
            {txId}
          </a>
          <br />
          Image CID: <code className="break-all">{imageCid}</code>
          <br />
          Metadata CID: <code className="break-all">{metadataCid}</code>
        </span>,
        { variant: 'success', autoHideDuration: 12000 },
      )

      onClaimed({ imageCid, metadataCid, txId })
    } catch (e: any) {
      enqueueSnackbar(`Mint failed: ${e?.message ?? e}`, { variant: 'error' })
    }
    setLoading(false)
  }

  return (
    <dialog id="claim_masterpass_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">Claim your MasterPass</h3>
        <p className="text-sm text-gray-600">Preview the image and confirm to mint.</p>
        <div className="mt-4 flex flex-col items-center gap-3">
          {previewUrl ? (
            <img src={previewUrl} alt="MasterPass preview" className="max-h-64 rounded-lg shadow-md" />
          ) : (
            <div className="text-gray-500 text-sm">No default image found. Please select a file.</div>
          )}
          <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={onSelectFile} />
        </div>
        <div className="modal-action">
          <button className="btn" onClick={() => setModalState(false)}>
            Close
          </button>
          <button className={`btn btn-primary ${!activeAddress || !file || loading ? 'btn-disabled' : ''}`} onClick={handleMint}>
            {loading ? <span className="loading loading-spinner" /> : 'Mint MasterPass'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default ClaimMasterPass


