import { useCallback, useState } from 'react';
import { Player } from '../types';
import DuplicatePlayerPrompt, { DuplicateDecision } from '../components/Players/DuplicatePlayerPrompt';

type PromptState = {
  existing: Player;
  incoming: Partial<Player> & { name: string };
  source: 'manual' | 'excel';
  resolve: (decision: DuplicateDecision) => void;
};

export const useDuplicatePlayerPrompt = () => {
  const [promptState, setPromptState] = useState<PromptState | null>(null);

  const requestDecision = useCallback(
    (existing: Player, incoming: Partial<Player> & { name: string }, source: 'manual' | 'excel' = 'manual') =>
      new Promise<DuplicateDecision>((resolve) => {
        setPromptState({ existing, incoming, source, resolve });
      }),
    []
  );

  const handleDecision = useCallback(
    (decision: DuplicateDecision) => {
      if (promptState) {
        promptState.resolve(decision);
        setPromptState(null);
      }
    },
    [promptState]
  );

  const prompt = promptState ? (
    <DuplicatePlayerPrompt
      existing={promptState.existing}
      incoming={promptState.incoming}
      source={promptState.source}
      onDecision={handleDecision}
    />
  ) : null;

  return { requestDecision, prompt };
};

export type DuplicateDecisionResult = DuplicateDecision;

