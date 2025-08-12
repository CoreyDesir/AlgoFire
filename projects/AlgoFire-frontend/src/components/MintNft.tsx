import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { uploadFileToIpfs, uploadJsonToIpfs } from '../utils/ipfs'
import { mintArc3Nft } from '../utils/mintArc3'

interface MintNftProps {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const MintNft = ({ openModal, setModalState }: MintNftProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const [unitName, setUnitName] = useState('MPASS')
  const [assetName, setAssetName] = useState('MasterPass #1')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [minting, setMinting] = useState(false)

  const handleMint = async () => {
    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
      return
    }
    if (!imageFile) {
      enqueueSnackbar('Please choose an image to mint', { variant: 'warning' })
      return
    }
    setMinting(true)
    try {
      // 1) Upload image to IPFS
      const { cid: imageCid } = await uploadFileToIpfs(imageFile)

      // 2) Build ARC-3 metadata and upload
      const metadata = {
        name: assetName,
        description: 'MasterPass NFT minted via AlgoFire',
        image: `ipfs://${imageCid}`,
        image_mimetype: imageFile.type || 'image/png',
        properties: { project: 'AlgoFire' },
      }
      const { cid: metadataCid, bytes } = await uploadJsonToIpfs(metadata)
      const metadataUrl = `ipfs://${metadataCid}`

      // 3) Mint the NFT (ASA create with ARC-3 fields)
      const txId = await mintArc3Nft({
        creator: activeAddress,
        unitName,
        assetName,
        metadataUrl,
        metadataJsonBytes: bytes,
        transactionSigner,
      })

      const storedNetwork = ((typeof window !== 'undefined' && window.localStorage.getItem('af-network')) || '').toLowerCase()
      const txExplorerBase = storedNetwork === 'mainnet' ? 'https://explorer.perawallet.app/tx' : 'https://testnet.explorer.perawallet.app/tx'

      enqueueSnackbar(
        <span>
          Minted! Tx: <a className="underline" href={`${txExplorerBase}/${txId}`} target="_blank" rel="noreferrer">{txId}</a>
          <br />
          Image CID: <code className="break-all">{imageCid}</code>
          <br />
          Metadata CID: <code className="break-all">{metadataCid}</code>
        </span>,
        { variant: 'success', autoHideDuration: 12000 },
      )
      setModalState(false)
    } catch (e: any) {
      enqueueSnackbar(`Mint failed: ${e?.message ?? e}`, { variant: 'error' })
    }
    setMinting(false)
  }

  return (
    <dialog id="mint_nft_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`}>
      <form method="dialog" className="modal-box relative">
        <button type="button" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setModalState(false)}>✕</button>
        <h3 className="font-bold text-lg">Mint NFT (ARC-3)</h3>
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Unit name (e.g., MPASS)"
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
          />
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Asset name (e.g., MasterPass #1)"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered w-full"
            onChange={(e) => setImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
          />
        </div>
        <div className="modal-action">
          <button className="btn" onClick={() => setModalState(false)}>Close</button>
          <button className={`btn btn-primary ${!activeAddress || minting ? 'btn-disabled' : ''}`} onClick={handleMint}>
            {minting ? <span className="loading loading-spinner" /> : 'Mint'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default MintNft


