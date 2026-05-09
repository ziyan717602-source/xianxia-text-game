interface EventDialogProps {
  eventText: string;
  choices: { text: string }[];
  eventId: string;
  onChoice: (choiceIndex: number) => void;
}

export function EventDialog({ eventText, choices, eventId, onChoice }: EventDialogProps) {
  return (
    <div className="event-backdrop" role="presentation">
      <section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-title">
        <p className="eyebrow" id="event-title">机缘 / 变故</p>
        <p className="event-text">{eventText}</p>
        <div className="event-actions">
          {choices.map((choice, index) => (
            <button
              className="choice-button"
              key={`${eventId}-${choice.text}`}
              onClick={() => onChoice(index)}
            >
              {choice.text}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
