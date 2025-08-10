import { OnSchemaBreak, OnUpdate } from '@algorandfoundation/algokit-utils/types/app'

// Temporary stub for generated contracts. Replace with generated file when available.
export class AlgofireFactory {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_params: { defaultSender?: string; algorand: unknown }) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deploy(_opts: { onSchemaBreak: OnSchemaBreak; onUpdate: OnUpdate }): Promise<{
    appClient: {
      send: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        hello: (_args: { args: { name: string } }) => Promise<{ return: string }>
      }
    }
  }> {
    throw new Error(
      'Generated contracts are missing. Run "npm run generate:app-clients" and ensure the generated contracts are available at src/contracts/Algofire.ts.',
    )
  }
}
