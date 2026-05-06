import React from 'react';
import { useGameLoop } from './useGameLoop';
import { ACTIONS } from '../game/actions';
import { EVENTS } from '../content/events';

export function App() {
  const { gameState, logs, doAction, handleEventChoice, saveGame, resetGame } = useGameLoop();
  const { resources, time, unlockedActions, activeEventId } = gameState;

  const activeEvent = activeEventId ? EVENTS.find(e => e.id === activeEventId) : null;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto', color: '#333', backgroundColor: '#fafafa', minHeight: '100vh', position: 'relative' }}>
      
      {/* 活跃事件弹窗 */}
      {activeEvent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
        }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2>机缘/变故</h2>
            <p>{typeof activeEvent.text === 'function' ? activeEvent.text(gameState) : activeEvent.text}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              {activeEvent.choices.map((choice, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleEventChoice(idx)}
                  style={{ padding: '10px', cursor: 'pointer' }}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
                    disabled={!!activeEventId}
                    style={{ padding: '8px 16px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {action.name}
                  </button>
                );
              })
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
