'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export default function MathAdventure() {
  // === STATE MANAGEMENT ===
  const [isClient, setIsClient] = useState(false);
  const [gameState, setGameState] = useState('START'); // START, PLAYING, QUIZ, PAUSED, GAMEOVER
  const [playerName, setPlayerName] = useState('');
  
  // Game Stats
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  
  // Game Physics
  const [charPos, setCharPos] = useState({ x: 50, y: 50 });
  const [fruitPos, setFruitPos] = useState({ x: 70, y: 30 });
  const [direction, setDirection] = useState('right');
  const [isMoving, setIsMoving] = useState(false);
  
  // Quiz System
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  // Visual Effects
  const [particles, setParticles] = useState([]);
  const [shake, setShake] = useState(false);
  const [flashCorrect, setFlashCorrect] = useState(false);
  
  // Refs for intervals
  const moveIntervalRef = useRef(null);
  const soundEnabledRef = useRef(true);

  // === INITIALIZATION ===
  useEffect(() => {
    setIsClient(true);
    loadGameData();
    randomizeFruit();
    
    // Prevent accidental page navigation
    const preventNav = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', preventNav);
    
    return () => {
      window.removeEventListener('keydown', preventNav);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, []);

  // === DATA PERSISTENCE ===
  const loadGameData = () => {
    try {
      const savedHighScore = localStorage.getItem('mathHighScore');
      const savedName = localStorage.getItem('mathPlayerName');
      if (savedHighScore) setHighScore(parseInt(savedHighScore));
      if (savedName) setPlayerName(savedName);
    } catch (e) {
      console.warn('LocalStorage not available:', e);
    }
  };

  const saveGameData = (newScore, name) => {
    try {
      if (newScore > highScore) {
        localStorage.setItem('mathHighScore', newScore);
        setHighScore(newScore);
      }
      if (name) {
        localStorage.setItem('mathPlayerName', name);
      }
    } catch (e) {
      console.warn('Could not save data:', e);
    }
  };

  // === SOUND SYSTEM ===
  const playSound = useCallback((name) => {
    if (!isClient || !soundEnabledRef.current) return;
    try {
      const audio = new Audio(`/${name}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  }, [isClient]);

  // === PARTICLE EFFECTS ===
  const createParticles = (x, y, type = 'star') => {
    const newParticles = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      emoji: type === 'star' ? '⭐' : type === 'heart' ? '❤️' : '💥',
      velocity: {
        x: (Math.random() - 0.5) * 4,
        y: -Math.random() * 5 - 2
      }
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(n => n.id === p.id)));
    }, 2000);
  };

  // === FRUIT SYSTEM ===
  const randomizeFruit = useCallback(() => {
    const newPos = {
      x: Math.floor(Math.random() * 70) + 15,
      y: Math.floor(Math.random() * 60) + 20
    };
    setFruitPos(newPos);
  }, []);

  // === MOVEMENT SYSTEM ===
  const moveCharacter = useCallback((dir) => {
    if (gameState !== 'PLAYING') return;

    setIsMoving(true);
    setDirection(dir === 'left' || dir === 'right' ? dir : direction);

    setCharPos((prev) => {
      const speed = 3;
      let newX = prev.x;
      let newY = prev.y;

      switch(dir) {
        case 'up':
          newY = Math.max(8, prev.y - speed);
          break;
        case 'down':
          newY = Math.min(88, prev.y + speed);
          break;
        case 'left':
          newX = Math.max(8, prev.x - speed);
          break;
        case 'right':
          newX = Math.min(92, prev.x + speed);
          break;
      }

      // Collision Detection (using circle collision)
      const dx = newX - fruitPos.x;
      const dy = newY - fruitPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 10) {
        playSound('collect');
        createParticles(fruitPos.x, fruitPos.y, 'star');
        generateQuestion();
        return prev;
      }

      return { x: newX, y: newY };
    });

    setTimeout(() => setIsMoving(false), 100);
  }, [gameState, fruitPos, direction, playSound]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const keyMap = {
        'ArrowUp': 'up',
        'w': 'up',
        'W': 'up',
        'ArrowDown': 'down',
        's': 'down',
        'S': 'down',
        'ArrowLeft': 'left',
        'a': 'left',
        'A': 'left',
        'ArrowRight': 'right',
        'd': 'right',
        'D': 'right',
      };
      
      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        moveCharacter(direction);
      }
      
      // Pause game
      if (e.key === 'Escape' && gameState === 'PLAYING') {
        setGameState('PAUSED');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveCharacter, gameState]);

  // === QUIZ SYSTEM ===
  const generateQuestion = useCallback(() => {
    setGameState('QUIZ');
    setSelectedAnswer(null);
    setShowResult(false);
    
    // Dynamic difficulty
    const level = Math.floor(score / 3);
    const timeLimit = Math.max(6, 15 - level);
    setTimeLeft(timeLimit);

    const range = Math.min(20 + (level * 8), 100);
    const useNegative = score > 5 ? Math.random() > 0.3 : false;
    
    const n1 = Math.floor(Math.random() * range) * (useNegative && Math.random() > 0.5 ? -1 : 1);
    const n2 = Math.floor(Math.random() * range) * (useNegative && Math.random() > 0.5 ? -1 : 1);
    
    // Random operation (more variety at higher levels)
    let operation, answer;
    const opRandom = Math.random();
    
    if (level < 3 || opRandom < 0.5) {
      operation = '+';
      answer = n1 + n2;
    } else if (opRandom < 0.8) {
      operation = '-';
      answer = n1 - n2;
    } else {
      // Multiplication for advanced players
      const smallN1 = Math.floor(Math.random() * 12) + 1;
      const smallN2 = Math.floor(Math.random() * 12) + 1;
      operation = '×';
      answer = smallN1 * smallN2;
      setQuestion({
        text: `${smallN1} ${operation} ${smallN2} = ?`,
        choices: generateChoices(answer),
        correct: answer,
        n1: smallN1,
        n2: smallN2,
        operation
      });
      return;
    }

    setQuestion({
      text: `${n1} ${operation} ${n2} = ?`,
      choices: generateChoices(answer),
      correct: answer,
      n1,
      n2,
      operation
    });
  }, [score]);

  const generateChoices = (correct) => {
    const choices = new Set([correct]);
    
    while (choices.size < 4) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const wrong = correct + offset;
      if (wrong !== correct) choices.add(wrong);
    }
    
    return Array.from(choices).sort(() => Math.random() - 0.5);
  };

  // Quiz Timer
  useEffect(() => {
    if (gameState === 'QUIZ' && timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'QUIZ' && timeLeft === 0 && !showResult) {
      handleAnswer(null);
    }
  }, [gameState, timeLeft, showResult]);

  // Answer Handler
  const handleAnswer = useCallback((answer) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === question.correct;
    
    if (isCorrect) {
      // Correct Answer
      playSound('correct');
      setFlashCorrect(true);
      setTimeout(() => setFlashCorrect(false), 500);
      
      const newScore = score + 1;
      const newCombo = combo + 1;
      setScore(newScore);
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));
      
      createParticles(50, 50, 'star');
      
      setTimeout(() => {
        randomizeFruit();
        setGameState('PLAYING');
      }, 1000);
      
    } else {
      // Wrong Answer
      playSound('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      setCombo(0);
      
      const newHearts = hearts - 1;
      setHearts(newHearts);
      
      if (newHearts <= 0) {
        setTimeout(() => endGame(), 1500);
      } else {
        setTimeout(() => {
          randomizeFruit();
          setGameState('PLAYING');
        }, 1500);
      }
    }
  }, [score, hearts, combo, maxCombo, question, showResult, playSound, randomizeFruit]);

  // === GAME FLOW ===
  const startGame = useCallback(() => {
    if (!playerName.trim()) return;
    
    saveGameData(0, playerName);
    setScore(0);
    setHearts(3);
    setCombo(0);
    setCharPos({ x: 50, y: 50 });
    randomizeFruit();
    setGameState('PLAYING');
    playSound('collect');
  }, [playerName, randomizeFruit, playSound]);

  const endGame = useCallback(() => {
    setGameState('GAMEOVER');
    saveGameData(score, playerName);
    
    if (score > highScore) {
      createParticles(50, 30, 'star');
    }
  }, [score, highScore, playerName]);

  const resetGame = useCallback(() => {
    setScore(0);
    setHearts(3);
    setCombo(0);
    setCharPos({ x: 50, y: 50 });
    randomizeFruit();
    setGameState('PLAYING');
  }, [randomizeFruit]);

  // === RENDER GUARD ===
  if (!isClient) {
    return (
      <div className="h-screen w-full relative overflow-hidden flex items-center justify-center">
        <img 
          src="/bg.png" 
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover opacity-80" 
          onError={(e) => e.target.style.display = 'none'}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 to-pink-900/50"></div>
        <div className="relative text-4xl font-bold text-white animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full relative overflow-hidden select-none ${shake ? 'animate-shake' : ''}`}>
      
      {/* === BACKGROUND === */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/bg.png" 
          alt="Background"
          className="w-full h-full object-cover" 
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.className = 'absolute inset-0 bg-gradient-animated';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 via-purple-900/30 to-pink-900/40"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-pink-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-yellow-300 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
      </div>

      {/* === PARTICLES === */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute text-2xl pointer-events-none z-50 animate-bounce"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: 'confetti 2s ease-out forwards'
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* === TOP HUD === */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-start z-30">
        <div className="flex flex-col gap-2">
          <div className="glass-btn px-5 py-2.5 text-sm font-bold">
            🏆 สูงสุด: {highScore}
          </div>
          {playerName && (
            <div className="glass-btn px-4 py-2 text-xs font-semibold">
              👤 {playerName}
            </div>
          )}
          {combo > 1 && gameState === 'PLAYING' && (
            <div className="score-badge text-sm animate-pulse-glow">
              🔥 Combo x{combo}
            </div>
          )}
        </div>

        {(gameState === 'PLAYING' || gameState === 'QUIZ') && (
          <div className="flex gap-3">
            <div className="score-badge text-lg">
              ⭐ {score}
            </div>
            <div className="heart-badge text-lg">
              {'❤️'.repeat(Math.max(0, hearts))}
            </div>
          </div>
        )}
      </div>

      {/* === GAME AREA === */}
      <div className="absolute inset-0 z-10">
        
        {/* PLAYER CHARACTER */}
        {(gameState === 'PLAYING' || gameState === 'QUIZ') && (
          <div 
            className="absolute w-20 h-20 md:w-24 md:h-24 transition-all duration-100 ease-out z-30 drop-shadow-2xl"
            style={{ 
              left: `${charPos.x}%`, 
              top: `${charPos.y}%`, 
              transform: `translate(-50%, -50%) ${direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)'} ${isMoving ? 'scale(1.1)' : 'scale(1)'}`
            }}
          >
            <div className="relative w-full h-full">
              <img 
                src="/hero.png" 
                alt="Hero"
                className="w-full h-full object-contain drop-shadow-lg" 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="text-5xl md:text-6xl">🦸</div>';
                }}
              />
            </div>
          </div>
        )}

        {/* FRUIT TARGET */}
        {(gameState === 'PLAYING' || gameState === 'QUIZ') && (
          <div 
            className="absolute w-16 h-16 md:w-20 md:h-20 z-20 animate-bounce-rotate"
            style={{ 
              left: `${fruitPos.x}%`, 
              top: `${fruitPos.y}%`, 
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative w-full h-full animate-pulse-glow rounded-full">
              <img 
                src="/apple.png" 
                alt="Apple"
                className="w-full h-full object-contain drop-shadow-2xl" 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="text-5xl md:text-6xl">🍎</div>';
                }}
              />
            </div>
          </div>
        )}

        {/* === START SCREEN === */}
        {gameState === 'START' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md z-50 p-4">
            <div className="glass-effect p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border-4 border-white/30 animate-pop">
              <div className="text-6xl md:text-7xl mb-4 animate-bounce">🎮</div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent mb-3 text-neon">
                Math Adventure!
              </h1>
              <p className="text-white/80 mb-6 text-sm md:text-base font-medium">
                ผจญภัยเก็บผลไม้ พิชิตโจทย์คณิตศาสตร์
              </p>
              
              <input 
                type="text" 
                placeholder="ใส่ชื่อฮีโร่..." 
                value={playerName}
                className="w-full glass-effect p-4 rounded-2xl text-center text-xl font-bold mb-6 outline-none focus:border-yellow-400 transition-all text-white placeholder-white/50"
                onChange={e => setPlayerName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && startGame()}
                maxLength={15}
                autoFocus
              />
              
              <button 
                onClick={startGame}
                disabled={!playerName.trim()}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-4 rounded-2xl font-bold text-xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              >
                เริ่มเกมเลย! 🚀
              </button>
              
              <div className="mt-6 text-white/60 text-xs">
                <p>💡 ใช้ลูกศร หรือ WASD ในการเคลื่อนที่</p>
                <p className="mt-1">🎯 เก็บผลไม้แล้วตอบโจทย์ให้ถูก!</p>
              </div>
            </div>
          </div>
        )}

        {/* === QUIZ MODAL === */}
        {gameState === 'QUIZ' && question && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 p-4">
            <div className={`glass-effect w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border-4 ${flashCorrect ? 'border-green-400 bg-green-500/20' : 'border-white/30'} animate-pop transition-all duration-300`}>
              
              {/* Quiz Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 relative">
                <div className="absolute top-4 right-4 bg-red-500/90 backdrop-blur px-4 py-2 rounded-full font-bold text-xl animate-pulse border-2 border-white/30">
                  ⏰ {timeLeft}s
                </div>
                <div className="text-center">
                  <h2 className="text-5xl md:text-6xl font-black text-white drop-shadow-lg mb-2">
                    {question.text}
                  </h2>
                  {combo > 0 && (
                    <div className="text-yellow-300 font-bold text-sm animate-bounce">
                      🔥 Combo x{combo}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Answer Choices */}
              <div className="p-6 grid grid-cols-2 gap-3 bg-gradient-to-b from-white/5 to-white/10">
                {question.choices.map((choice, idx) => {
                  const isSelected = selectedAnswer === choice;
                  const isCorrect = choice === question.correct;
                  const showCorrectness = showResult && isSelected;
                  
                  return (
                    <button 
                      key={idx}
                      onClick={() => !showResult && handleAnswer(choice)}
                      disabled={showResult}
                      className={`
                        glass-effect py-6 rounded-2xl text-3xl font-black transition-all
                        ${!showResult && 'hover:scale-105 hover:bg-white/20 active:scale-95'}
                        ${showCorrectness && isCorrect && 'bg-green-500/40 border-green-400 scale-110'}
                        ${showCorrectness && !isCorrect && 'bg-red-500/40 border-red-400 animate-shake'}
                        ${showResult && isCorrect && !isSelected && 'bg-green-500/20 border-green-400/50'}
                        ${showResult && 'cursor-not-allowed'}
                      `}
                    >
                      <div className="text-white drop-shadow-lg">
                        {choice}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Result Message */}
              {showResult && (
                <div className={`p-4 text-center font-bold text-lg ${selectedAnswer === question.correct ? 'text-green-300' : 'text-red-300'} animate-pop`}>
                  {selectedAnswer === question.correct ? (
                    <>🎉 ถูกต้อง! +1 คะแนน</>
                  ) : (
                    <>💔 ผิดแล้ว! คำตอบคือ {question.correct}</>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === PAUSED SCREEN === */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-lg z-50">
            <div className="glass-effect p-10 rounded-3xl text-center border-4 border-white/30 animate-pop">
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-4xl font-black text-white mb-6">หยุดพักก่อน</h2>
              <button 
                onClick={() => setGameState('PLAYING')}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all hover:scale-105"
              >
                ▶️ เล่นต่อ
              </button>
            </div>
          </div>
        )}

        {/* === GAME OVER SCREEN === */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg z-50 p-4">
            <div className="glass-effect p-8 md:p-10 rounded-3xl text-center max-w-md w-full border-4 border-red-300/30 animate-pop">
              <div className="text-7xl mb-4 animate-bounce">
                {score > highScore ? '🏆' : '💀'}
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                {score > highScore ? 'สถิติใหม่!' : 'Game Over!'}
              </h2>
              
              <div className="glass-effect p-6 rounded-2xl mb-6 border-2 border-white/20">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-white/60 text-sm font-bold uppercase">คะแนน</p>
                    <p className="text-5xl font-black text-yellow-300 drop-shadow-lg">{score}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm font-bold uppercase">สูงสุด</p>
                    <p className="text-5xl font-black text-pink-300 drop-shadow-lg">{highScore}</p>
                  </div>
                </div>
                
                {maxCombo > 1 && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-white/60 text-sm font-bold uppercase">Combo สูงสุด</p>
                    <p className="text-3xl font-black text-orange-300">🔥 x{maxCombo}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={resetGame}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-2xl transition-all hover:scale-105 active:scale-95"
                >
                  🔄 เล่นอีกครั้ง
                </button>
                <button 
                  onClick={() => setGameState('START')}
                  className="flex-1 glass-btn py-4 font-bold text-lg"
                >
                  🏠 หน้าแรก
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* === MOBILE D-PAD CONTROLS === */}
      {(gameState === 'PLAYING' || gameState === 'QUIZ') && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 lg:hidden">
          <div className="grid grid-cols-3 gap-3">
            {/* Top Row */}
            <div className="w-24 h-24" />
            <button 
              className="w-24 h-24 backdrop-blur-xl bg-white/25 border-3 border-white/40 
                         rounded-2xl flex items-center justify-center text-5xl 
                         transition-all duration-150 shadow-2xl cursor-pointer
                         hover:bg-white/35 active:bg-white/50 active:scale-90
                         select-none touch-none"
              onTouchStart={(e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                moveCharacter('up'); 
              }}
              onClick={(e) => {
                e.preventDefault();
                moveCharacter('up');
              }}
            >
              ⬆️
            </button>
            <div className="w-24 h-24" />
            
            {/* Middle Row */}
            <button 
              className="w-24 h-24 backdrop-blur-xl bg-white/25 border-3 border-white/40 
                         rounded-2xl flex items-center justify-center text-5xl 
                         transition-all duration-150 shadow-2xl cursor-pointer
                         hover:bg-white/35 active:bg-white/50 active:scale-90
                         select-none touch-none"
              onTouchStart={(e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                moveCharacter('left'); 
              }}
              onClick={(e) => {
                e.preventDefault();
                moveCharacter('left');
              }}
            >
              ⬅️
            </button>
            <div className="w-24 h-24 backdrop-blur-lg bg-white/10 rounded-full border-2 border-white/20 flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400/50 to-purple-500/50 rounded-full animate-pulse" />
            </div>
            <button 
              className="w-24 h-24 backdrop-blur-xl bg-white/25 border-3 border-white/40 
                         rounded-2xl flex items-center justify-center text-5xl 
                         transition-all duration-150 shadow-2xl cursor-pointer
                         hover:bg-white/35 active:bg-white/50 active:scale-90
                         select-none touch-none"
              onTouchStart={(e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                moveCharacter('right'); 
              }}
              onClick={(e) => {
                e.preventDefault();
                moveCharacter('right');
              }}
            >
              ➡️
            </button>
            
            {/* Bottom Row */}
            <div className="w-24 h-24" />
            <button 
              className="w-24 h-24 backdrop-blur-xl bg-white/25 border-3 border-white/40 
                         rounded-2xl flex items-center justify-center text-5xl 
                         transition-all duration-150 shadow-2xl cursor-pointer
                         hover:bg-white/35 active:bg-white/50 active:scale-90
                         select-none touch-none"
              onTouchStart={(e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                moveCharacter('down'); 
              }}
              onClick={(e) => {
                e.preventDefault();
                moveCharacter('down');
              }}
            >
              ⬇️
            </button>
            <div className="w-24 h-24" />
          </div>
        </div>
      )}

      {/* === FOOTER === */}
      <div className="absolute bottom-2 w-full text-center text-white/30 text-xs font-medium z-20">
        Math Adventure v2.0 - Enhanced Edition ✨
      </div>
    </div>
  );
}