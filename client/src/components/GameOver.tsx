type GameOverProps = {
  message: string;
  winnerId: string | null;
  playerId: string | null;
  onRematch: () => void;
};

export function GameOver({ message, winnerId, playerId, onRematch }: GameOverProps) {
  const youWon = winnerId && playerId && winnerId === playerId;
  const isTie = winnerId === null;

  return (
    <div className="game-over card">
      <h2>{isTie ? "It's a tie!" : youWon ? 'You win!' : 'You lose!'}</h2>
      <p>{message}</p>
      <button onClick={onRematch}>Rematch</button>
    </div>
  );
}
