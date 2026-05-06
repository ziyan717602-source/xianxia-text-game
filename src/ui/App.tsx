import React from 'react';
import { useGameLoop } from './useGameLoop';
import { ACTIONS } from '../game/actions';

export function App() {
  const { gameState, logs, doAction, saveGame, resetGame } = useGameLoop();
  const { resources, time, unlockedActions } = gameState;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto', color: '#333', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>文字修仙 (测试版)</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            Tick: {time.tick} | 境界: {gameState.realm}
          </p>
        </div>
        <div>
          <button onClick={saveGame} style={{ padding: '4px 8px', marginRight: '10px', cursor: 'pointer' }}>保存进度</button>
          <button onClick={() => { if(window.confirm('重置将丢失所有进度，确认？')) resetGame(); }} style={{ padding: '4px 8px', cursor: 'pointer', color: 'red' }}>重置游戏</button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* 左侧：资源与状态 */}
        <div style={{ flex: 1, borderRight: '1px solid #eee', paddingRight: '20px' }}>
          <h3>状态</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>体力: {resources.stamina.toFixed(0)}</li>
            <li>真气: {resources.qi.toFixed(0)}</li>
            <li>寿元: {Math.floor(resources.lifespan / (360 * 10))} 年 (剩余 tick: {resources.lifespan})</li>
            <li>草药: {resources.herbs}</li>
            <li>钱币: {resources.coins}</li>
            <li>见闻: {resources.knowledge}</li>
            <li>伤势: {resources.wounds}</li>
          </ul>
        </div>

        {/* 中间：行动 */}
        <div style={{ flex: 1, borderRight: '1px solid #eee', paddingRight: '20px' }}>
          <h3>行动</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {unlockedActions.length === 0 ? (
              <p style={{ color: '#999' }}>暂时无事可做，等待机缘...</p>
            ) : (
              unlockedActions.map((actionId) => {
                const action = ACTIONS[actionId];
                if (!action) return null;
                return (
                  <button 
                    key={actionId} 
                    onClick={() => doAction(actionId)}
                    style={{ padding: '8px 16px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {action.name}
                  </button>
                );
              })
            )}
            
            {/* 为了测试初始，硬编码一个休息按钮 */}
            {!unlockedActions.includes('xiuxi') && (
              <button 
                onClick={() => doAction('xiuxi')}
                style={{ padding: '8px 16px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                休息 (测试内置)
              </button>
            )}
            {!unlockedActions.includes('tuna') && resources.knowledge >= 2 && (
              <button 
                onClick={() => doAction('tuna')}
                style={{ padding: '8px 16px', cursor: 'pointer', background: '#e0f7fa', border: '1px solid #00bcd4', borderRadius: '4px' }}
                title="满足隐藏条件，强行吐纳"
              >
                吐纳 (测试强制)
              </button>
            )}
          </div>
        </div>

        {/* 右侧：日志 */}
        <div style={{ flex: 1.5 }}>
          <h3>仙途记录</h3>
          <div style={{ background: '#000', color: '#0f0', padding: '10px', height: '300px', overflowY: 'auto', borderRadius: '4px', fontSize: '12px' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '5px' }}>&gt; {log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
