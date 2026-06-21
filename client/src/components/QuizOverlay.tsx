import type { QuizState } from '@word-crush-duel/shared';

type QuizOverlayProps = {
  quiz: QuizState;
  playerId: string | null;
  now: number;
  onAnswer: (choice: string) => void;
};

export function QuizOverlay({ quiz, playerId, now, onAnswer }: QuizOverlayProps) {
  const answer = playerId ? quiz.answers[playerId] : undefined;
  const secondsLeft = Math.max(1, Math.ceil((quiz.endsAt - now) / 1000));

  return (
    <div className="quiz-overlay" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <div className="quiz-topline">
        <span className="quiz-label">Meaning challenge</span>
        <span className="quiz-timer">{secondsLeft}</span>
      </div>
      <h2 id="quiz-title">Complete the sentence</h2>
      <p className="quiz-prompt">{quiz.prompt}</p>

      <div className="quiz-choices">
        {quiz.choices.map((choice) => {
          const selected = answer?.choice === choice;
          const revealCorrect = Boolean(answer && choice === quiz.targetWord);
          const selectedWrong = Boolean(selected && answer && !answer.correct);
          return (
            <button
              type="button"
              key={choice}
              className={[
                'quiz-choice',
                selected ? 'selected' : '',
                revealCorrect ? 'correct' : '',
                selectedWrong ? 'wrong' : '',
              ].filter(Boolean).join(' ')}
              disabled={Boolean(answer)}
              onClick={() => onAnswer(choice)}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {answer && (
        <p className={`quiz-feedback ${answer.correct ? 'correct' : 'wrong'}`}>
          {answer.correct ? `Correct! +${answer.points}` : `The answer is ${quiz.targetWord}.`}
        </p>
      )}
    </div>
  );
}
