interface GameLogProps {
  logs: string[];
  recentSummary: string[];
  worldLogs: string[];
}

export function GameLog({ logs, recentSummary, worldLogs }: GameLogProps) {
  return (
    <section className="panel log-panel">
      <h2>仙途记录</h2>
      <div className="summary-block" aria-label="近日摘要">
        <h3>近日摘要</h3>
        {recentSummary.map((line, index) => (
          <p key={`${index}-${line}`}>{line}</p>
        ))}
      </div>
      <div className="world-block" aria-label="世界日志">
        <h3>世界日志</h3>
        {worldLogs.map((log, index) => (
          <p key={`${index}-${log}`}>{log}</p>
        ))}
      </div>
      <div className="log-scroll" aria-live="polite">
        {logs.map((log, index) => (
          <p key={`${index}-${log}`}>{log}</p>
        ))}
      </div>
    </section>
  );
}
