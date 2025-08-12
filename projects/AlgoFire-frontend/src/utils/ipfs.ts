/*
  Filebase IPFS uploads via the IPFS HTTP API
  Docs: https://docs.filebase.com/ipfs-pinning/ipfs-api
  Env required (exposed at build-time; do not use in production without a backend):
    - VITE_FILEBASE_KEY
    - VITE_FILEBASE_SECRET
*/

function getAuthHeader(): string {
  const apiKey = import.meta.env.VITE_FILEBASE_API_KEY as string | undefined
  if (!apiKey) {
    throw new Error('VITE_FILEBASE_API_KEY is not set. Add your Filebase IPFS API key to the environment.')
  }
  return `Bearer ${apiKey}`
}

async function parseIpfsAddResponse(response: Response): Promise<{ cid: string }> {
  const text = await response.text()
  // ipfs add returns ndjson; take the last JSON line
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const last = JSON.parse(lines[lines.length - 1]) as any
  const cid = last.Hash || last.cid || last.IpfsHash
  if (!cid) throw new Error('Unable to determine CID from Filebase response')
  return { cid }
}

export async function uploadFileToIpfs(file: File): Promise<{ cid: string }> {
  const form = new FormData()
  form.append('file', file, file.name)
  const res = await fetch('https://rpc.filebase.io/api/v0/add?pin=true', {
    method: 'POST',
    headers: { Authorization: getAuthHeader() },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Filebase upload failed (${res.status}) ${body}`)
  }
  return parseIpfsAddResponse(res)
}

export async function uploadJsonToIpfs(
  json: Record<string, unknown>,
  filename: string = 'metadata.json',
): Promise<{ cid: string; bytes: Uint8Array; contentType: string }> {
  const jsonString = JSON.stringify(json)
  const bytes = new TextEncoder().encode(jsonString)
  const blob = new Blob([bytes], { type: 'application/json' })
  const file = new File([blob], filename, { type: 'application/json' })
  const { cid } = await uploadFileToIpfs(file)
  return { cid, bytes, contentType: 'application/json' }
}


