export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ModelProvider = { id: string };
export const behaviour: { fn: (system: string, messages: ChatTurn[]) => Promise<string>; calls: number } = { fn: async () => "{}", calls: 0 };
export async function callProviderChat(_p: ModelProvider, _k: string, args: { system: string; messages: ChatTurn[] }) {
  behaviour.calls++;
  return { text: await behaviour.fn(args.system, args.messages), tokens: 10 };
}
