// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Transact from './components/Transact'
import MintNft from './components/MintNft'
import ClaimMasterPass from './components/ClaimMasterPass'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [openMintModal, setOpenMintModal] = useState<boolean>(false)
  const [openClaimModal, setOpenClaimModal] = useState<boolean>(false)
  const [claimed, setClaimed] = useState<boolean>(false)
  const [lastCid, setLastCid] = useState<string | null>(null)
  const { activeAddress } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const toggleDemoModal = () => {
    setOpenDemoModal(!openDemoModal)
  }

  // Reset claim message if wallet disconnects
  React.useEffect(() => {
    if (!activeAddress) setClaimed(false)
  }, [activeAddress])

  // Wallet hover disconnect logic (not currently used)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-cyan-300 to-pink-200">
      <div className="w-full max-w-lg bg-white/90 rounded-3xl shadow-2xl p-8 flex flex-col items-center border-4 border-pink-200">
        <h1 className="text-4xl md:text-5xl font-extrabold text-teal-700 mb-2 drop-shadow-sm">
          Welcome to <span className="text-pink-500">MasterPass</span>{' '}
          <span role="img" aria-label="ticket">
            🎟️
          </span>
        </h1>
        <p className="text-lg text-gray-700 mt-2 mb-6 font-medium">
          Your exclusive ticket to join the next-gen Web3 event. Connect your wallet, claim your pass, and be part of something special!
        </p>
        <div className="flex flex-col gap-4 w-full items-center mt-2">
          {!activeAddress && (
            <button
              data-test-id="connect-wallet"
              className="btn btn-primary w-60 text-lg bg-gradient-to-r from-teal-400 to-pink-400 border-0 shadow-md hover:scale-105 transition-transform"
              onClick={toggleWalletModal}
            >
              Connect Wallet
            </button>
          )}
          <button
            data-test-id="transactions-demo"
            className={`btn w-60 text-lg bg-gradient-to-r from-pink-400 to-teal-400 border-0 shadow-md hover:scale-105 transition-transform ${!activeAddress ? 'btn-disabled opacity-60' : ''}`}
            onClick={toggleDemoModal}
            disabled={!activeAddress}
          >
            Send Payment
          </button>
          <button
            data-test-id="mint-nft"
            className={`btn w-60 text-lg bg-gradient-to-r from-green-300 to-blue-400 border-0 shadow-md hover:scale-105 transition-transform ${!activeAddress ? 'btn-disabled opacity-60' : ''}`}
            onClick={() => setOpenMintModal(true)}
            disabled={!activeAddress}
          >
            Mint NFT
          </button>
          <button
            className={`btn w-60 text-lg bg-gradient-to-r from-yellow-300 to-pink-400 border-0 shadow-md hover:scale-105 transition-transform ${!activeAddress || claimed ? 'btn-disabled opacity-60' : ''}`}
            onClick={() => setOpenClaimModal(true)}
            disabled={!activeAddress || claimed}
            data-test-id="claim-masterpass"
          >
            {claimed ? 'MasterPass Claimed!' : 'Get Your MasterPass'}
          </button>
          {claimed && (
            <div className="mt-2 text-green-600 font-bold text-lg animate-bounce" data-test-id="claim-success">
              🎉 You&apos;ve claimed your ticket!
              {lastCid ? (
                <div className="text-xs text-gray-700 mt-1 break-all">
                  IPFS CID: <code>{lastCid}</code>
                </div>
              ) : null}
            </div>
          )}
        </div>
        <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
        <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
        <MintNft openModal={openMintModal} setModalState={setOpenMintModal} />
        <ClaimMasterPass
          openModal={openClaimModal}
          setModalState={setOpenClaimModal}
          onClaimed={({ imageCid }) => {
            setClaimed(true)
            setLastCid(imageCid)
            setOpenClaimModal(false)
          }}
        />
      </div>
    </div>
  )
}

export default Home
