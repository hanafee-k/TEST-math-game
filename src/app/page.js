'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { saveScoreToFirebase, getTopScores } from './firebase';

// === คลังโจทย์อัตราส่วน (ม.1) - แบบง่าย & คิดในใจไวๆ ===
const RATIONAL_QUESTIONS = [
  // หมวด: อัตราส่วนอย่างต่ำ
  { text: "อัตราส่วน 2:4 ทำเป็นอย่างต่ำคือ?", correct: "1:2", choices: ["1:2", "1:3", "2:1", "1:4"] },
  { text: "อัตราส่วน 10:15 ทำเป็นอย่างต่ำคือ?", correct: "2:3", choices: ["2:3", "1:2", "3:2", "1:3"] },
  { text: "อัตราส่วน 4:12 ทำเป็นอย่างต่ำคือ?", correct: "1:3", choices: ["1:3", "1:4", "2:3", "1:2"] },
  { text: "อัตราส่วน 9:3 ทำเป็นอย่างต่ำคือ?", correct: "3:1", choices: ["3:1", "1:3", "9:1", "1:9"] },
  { text: "อัตราส่วน 20:100 ทำเป็นอย่างต่ำคือ?", correct: "1:5", choices: ["1:5", "1:10", "1:4", "1:2"] },

  // หมวด: อัตราส่วนที่เท่ากัน
  { text: "ข้อใดคืออัตราส่วนที่เท่ากับ 1:3 ?", correct: "2:6", choices: ["2:6", "3:1", "2:5", "3:6"] },
  { text: "อัตราส่วน 3:4 เท่ากับข้อใด?", correct: "6:8", choices: ["6:8", "4:3", "9:16", "3:8"] },
  { text: "อัตราส่วน 5:10 เขียนเป็นเศษส่วนได้คือ?", correct: "1/2", choices: ["1/2", "1/5", "2/1", "5/10"] },

  // หมวด: สัดส่วน (หาค่าที่หายไป)
  { text: "ถ้า a:b = 1:2 และ a = 3 แล้ว b = ?", correct: "6", choices: ["6", "5", "3", "2"] },
  { text: "ถ้า x:2 = 3:6 แล้ว x = ?", correct: "1", choices: ["1", "2", "3", "6"] },
  { text: "ถ้า m/4 = 1/2 แล้ว m = ?", correct: "2", choices: ["2", "1", "4", "8"] },
  { text: "ถ้า 2:5 = 4:x แล้ว x = ?", correct: "10", choices: ["10", "5", "8", "20"] },
  { text: "ถ้า ก : ข = 1 : 4 และ ก=2 แล้ว ข=?", correct: "8", choices: ["8", "4", "2", "6"] },
  { text: "ถ้า x:3 = 2:6 แล้ว x = ?", correct: "1", choices: ["1", "2", "3", "6"] },

  // หมวด: โจทย์ปัญหาและหน่วย (สั้นๆ)
  { text: "แบ่งเงิน 100฿ ให้ A และ B ในอัตรา 1:1 A ได้เท่าไร?", correct: "50", choices: ["50", "100", "25", "75"] },
  { text: "ไข่ไก่ 3 ฟอง 15 บาท, ไข่ 1 ฟองกี่บาท?", correct: "5", choices: ["5", "3", "10", "15"] },
  { text: "1 ชั่วโมง : 30 นาที ทำเป็นอัตราส่วนอย่างต่ำได้?", correct: "2:1", choices: ["2:1", "1:30", "1:2", "60:1"] },
  { text: "1 เมตร : 50 ซม. เท่ากับอัตราส่วนใด?", correct: "2:1", choices: ["2:1", "1:50", "100:1", "1:2"] },
  { text: "ซื้อสมุด 2 เล่ม 20฿ ถ้าซื้อ 3 เล่ม กี่บาท?", correct: "30", choices: ["30", "40", "10", "60"] },
  { text: "นม 1 กล่อง 12฿ นม 2 กล่องกี่บาท?", correct: "24", choices: ["24", "12", "36", "48"] }
];

export default function MathAdventure() {
  // === STATE MANAGEMENT ===
  const [isClient, setIsClient] = useState(false);
  const [gameState, setGameState] = useState('START');
  const [playerName, setPlayerName] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game Stats
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Game Physics
  const [charPos, setCharPos] = useState({ x: 50, y: 50 });
  const [wormPos, setWormPos] = useState({ x: 70, y: 30 }); // 🐛 เปลี่ยนจาก fruit เป็น worm
  const [direction, setDirection] = useState('right');
  const [isMoving, setIsMoving] = useState(false);

  // Entities
  const [enemies, setEnemies] = useState([]); // 🦅 ศัตรู (เหยี่ยว/นักล่า)
  const [obstacles, setObstacles] = useState([]); // 🧱 สิ่งกีดขวาง

  // Quiz System
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Visual Effects
  const [particles, setParticles] = useState([]);
  const [shake, setShake] = useState(false);
  const [flashCorrect, setFlashCorrect] = useState(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Refs
  const moveIntervalRef = useRef(null);
  const soundEnabledRef = useRef(true);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const newState = !prev;
      soundEnabledRef.current = newState; // อัปเดตให้ระบบเสียงรู้
      return newState;
    });
  };

  // === INITIALIZATION ===
  useEffect(() => {
    setIsClient(true);
    loadGameData();
    randomizeWorm();

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
  const loadGameData = async () => {
    try {
      const savedHighScore = localStorage.getItem('mathHighScore');
      const savedName = localStorage.getItem('mathPlayerName');
      if (savedHighScore) setHighScore(parseInt(savedHighScore));
      if (savedName) setPlayerName(savedName);
      await loadLeaderboard();
    } catch (e) { console.warn('Error loading game data:', e); }
  };

  const loadLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const scores = await getTopScores(10);
      setLeaderboard(scores);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      const savedLeaderboard = localStorage.getItem('mathLeaderboard');
      if (savedLeaderboard) setLeaderboard(JSON.parse(savedLeaderboard));
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const saveGameData = async (newScore, name) => {
    try {
      if (newScore > highScore) {
        localStorage.setItem('mathHighScore', newScore);
        setHighScore(newScore);
      }
      if (name) localStorage.setItem('mathPlayerName', name);

      if (newScore > 0) {
        await saveScoreToFirebase(name || 'Player', newScore, maxCombo);
        await loadLeaderboard();
      }
    } catch (e) { console.warn('Could not save data:', e); }
  };

  // === SOUND SYSTEM ===
  const playSound = useCallback((name) => {
    if (!isClient || !soundEnabledRef.current) return;
    try {
      const audio = new Audio(`/${name}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => { });
    } catch (e) { }
  }, [isClient]);

  // === PARTICLE EFFECTS ===
  const createParticles = (x, y, type = 'star') => {
    const newParticles = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      emoji: type === 'star' ? '⭐' : type === 'heart' ? '❤️' : '💥',
      velocity: { x: (Math.random() - 0.5) * 4, y: -Math.random() * 5 - 2 }
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(n => n.id === p.id)));
    }, 2000);
  };

  // === WORM SYSTEM 🐛 ===
  const randomizeWorm = useCallback(() => {
    const newPos = {
      x: Math.floor(Math.random() * 70) + 15,
      y: Math.floor(Math.random() * 60) + 20
    };
    setWormPos(newPos);
  }, []);

  // === ENEMY SYSTEM 🦅 ===
  const spawnEnemy = useCallback((force = false) => {
    if (!force && gameState !== 'PLAYING') return;
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    switch (edge) {
      case 0: x = Math.random() * 100; y = -10; break;
      case 1: x = 110; y = Math.random() * 100; break;
      case 2: x = Math.random() * 100; y = 110; break;
      case 3: x = -10; y = Math.random() * 100; break;
    }
    const calculatedSpeed = Math.min(0.7 + (score * 0.03), 2.0);
    setEnemies(prev => [...prev, {
      id: Date.now() + Math.random(),
      x,
      y,
      speed: calculatedSpeed,
      direction: x < 50 ? 'right' : 'left'
    }]);
  }, [gameState, score]);

  // === OBSTACLE SYSTEM (STATIC BLOCKS 🧱) ===
  const randomizeObstacles = useCallback((safeX = 50, safeY = 50) => {
    // 1. สุ่มจำนวนให้ออกแค่ 3 หรือ 4 อัน (เยอะสุด 4)
    const count = Math.floor(Math.random() * 2) + 3;
    const newObstacles = [];

    for (let i = 0; i < count; i++) {
      let ox, oy;
      let isSafe = false;
      let attempts = 0; // ตัวกันค้าง

      while (!isSafe && attempts < 50) {
        ox = Math.floor(Math.random() * 80) + 10;
        oy = Math.floor(Math.random() * 80) + 10;
        isSafe = true;

        // กฎข้อที่ 1: ห้ามเกิดทับผู้เล่น (เว้นระยะห่าง 20)
        const distToPlayer = Math.sqrt(Math.pow(ox - safeX, 2) + Math.pow(oy - safeY, 2));
        if (distToPlayer < 20) {
          isSafe = false;
        }

        // กฎข้อที่ 2: ห้ามเกิดติดกันเอง! (เช็คระยะห่างกับต้นไม้อื่นๆ ต้องห่างกันอย่างน้อย 25)
        for (const existing of newObstacles) {
          const distToOther = Math.sqrt(Math.pow(ox - existing.x, 2) + Math.pow(oy - existing.y, 2));
          if (distToOther < 25) {
            isSafe = false;
            break;
          }
        }
        attempts++;
      }

      if (isSafe) {
        newObstacles.push({ id: Date.now() + Math.random(), x: ox, y: oy });
      }
    }
    setObstacles(newObstacles);
  }, []);

  // === END GAME TRIGGER ===
  const endGame = useCallback(() => {
    setGameState('GAMEOVER');
    setEnemies([]);
    setObstacles([]);
    saveGameData(score, playerName);
    if (score > highScore) createParticles(50, 30, 'star');
  }, [score, highScore, playerName]);

  // === QUIZ SYSTEM ===
  const generateQuestion = useCallback(() => {
    setGameState('QUIZ');
    setSelectedAnswer(null);
    setShowResult(false);

    const level = Math.floor(score / 3);
    const timeLimit = Math.max(8, 20 - level);
    setTimeLeft(timeLimit);

    const randomIndex = Math.floor(Math.random() * RATIONAL_QUESTIONS.length);
    const selectedItem = RATIONAL_QUESTIONS[randomIndex];

    const shuffledChoices = [...selectedItem.choices].sort(() => Math.random() - 0.5);

    setQuestion({
      text: selectedItem.text,
      choices: shuffledChoices,
      correct: selectedItem.correct
    });
  }, [score]);

  // === MOVEMENT & COLLISION SYSTEM ===
  const moveCharacter = useCallback((dir) => {
    if (gameState !== 'PLAYING') return;

    setIsMoving(true);
    setDirection(dir === 'left' || dir === 'right' ? dir : direction);

    setCharPos((prev) => {
      const speed = 4;
      let newX = prev.x;
      let newY = prev.y;

      switch (dir) {
        case 'up': newY = Math.max(8, prev.y - speed); break;
        case 'down': newY = Math.min(88, prev.y + speed); break;
        case 'left': newX = Math.max(8, prev.x - speed); break;
        case 'right': newX = Math.min(92, prev.x + speed); break;
      }

      // 1. 🛑 เช็คชนสิ่งกีดขวาง (บล็อคทาง ไม่ให้เดินผ่าน)
      let hitObstacle = false;
      for (const obs of obstacles) {
        const dist = Math.sqrt(Math.pow(newX - obs.x, 2) + Math.pow(newY - obs.y, 2));
        if (dist < 6) { // ปรับรัศมีให้เล็กลงแล้ว เดินไถกำแพงได้ง่ายขึ้น!
          hitObstacle = true;
          break;
        }
      }

      if (hitObstacle) return prev;

      // 2. 🐛 เช็คเก็บหนอน (เพื่อไปตอบคำถาม)
      const dx = newX - wormPos.x;
      const dy = newY - wormPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5) {
        playSound('collect');
        createParticles(wormPos.x, wormPos.y, 'star');
        generateQuestion();
        return prev;
      }
      return { x: newX, y: newY };
    });

    setTimeout(() => setIsMoving(false), 100);
  }, [gameState, wormPos, direction, obstacles, playSound, generateQuestion]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const keyMap = {
        'ArrowUp': 'up', 'w': 'up', 'W': 'up',
        'ArrowDown': 'down', 's': 'down', 'S': 'down',
        'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
        'ArrowRight': 'right', 'd': 'right', 'D': 'right',
      };
      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        moveCharacter(direction);
      }
      if (e.key === 'Escape' && gameState === 'PLAYING') setGameState('PAUSED');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveCharacter, gameState]);

  useEffect(() => {
    if (gameState === 'QUIZ' && timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'QUIZ' && timeLeft === 0 && !showResult) {
      handleAnswer(null);
    }
  }, [gameState, timeLeft, showResult]);

  // === ANSWER HANDLER ===
  const handleAnswer = useCallback((answer) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === question.correct;

    if (isCorrect) {
      playSound('correct');
      setFlashCorrect(true);
      setTimeout(() => setFlashCorrect(false), 500);

      const newScore = score + 1;
      const newCombo = combo + 1;
      setScore(newScore);
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));

      createParticles(50, 50, 'star');
      setEnemies([]);

      setTimeout(() => {
        randomizeWorm();
        randomizeObstacles(charPos.x, charPos.y);
        setGameState('PLAYING');
        spawnEnemy(true);
      }, 1000);

    } else {
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
          randomizeWorm();
          randomizeObstacles(charPos.x, charPos.y);
          setGameState('PLAYING');
        }, 1500);
      }
    }
  }, [score, hearts, combo, maxCombo, question, showResult, playSound, randomizeWorm, spawnEnemy, charPos, randomizeObstacles, endGame]);

  // === GAME FLOW ===
  const startGame = useCallback(() => {
    if (!playerName.trim()) return;
    saveGameData(0, playerName);
    setScore(0);
    setHearts(3);
    setCombo(0);
    setEnemies([]);
    setCharPos({ x: 50, y: 50 });
    randomizeWorm();
    randomizeObstacles(50, 50);
    setGameState('PLAYING');
    playSound('collect');
  }, [playerName, randomizeWorm, playSound, randomizeObstacles]);

  const resetGame = useCallback(() => {
    setScore(0);
    setHearts(3);
    setCombo(0);
    setEnemies([]);
    setCharPos({ x: 50, y: 50 });
    randomizeWorm();
    randomizeObstacles(50, 50);
    setGameState('PLAYING');
  }, [randomizeWorm, randomizeObstacles]);

  // === GAME LOOP: ENEMY MOVEMENT ===
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const gameLoop = setInterval(() => {
      // ขยับศัตรู 
      setEnemies(prev => prev.map(enemy => {
        const dx = charPos.x - enemy.x;
        const dy = charPos.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return enemy;
        const newX = enemy.x + (dx / distance) * enemy.speed;
        const newY = enemy.y + (dy / distance) * enemy.speed;
        const currentDirection = dx > 0 ? 'right' : 'left';

        // 👇 แก้ตรงนี้: ลดระยะชนลงเหลือ 6 (ภาพจะได้ดูทับกันจริงๆ ถึงจะโดนกัด)
        if (Math.sqrt(Math.pow(newX - charPos.x, 2) + Math.pow(newY - charPos.y, 2)) < 6) {
          playSound('wrong');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setHearts(h => { const newH = h - 1; if (newH <= 0) setTimeout(() => endGame(), 500); return newH; });

          // 👇 เพิ่มระบบวาร์ป: เมื่อนกโดนกัด เหยี่ยวตัวนั้นจะถูกจับโยนไปเกิดใหม่ขอบจอไกลๆ ทันที
          const edge = Math.floor(Math.random() * 4);
          let respawnX, respawnY;
          switch (edge) {
            case 0: respawnX = Math.random() * 100; respawnY = -20; break; // โยนไปบนสุด
            case 1: respawnX = 120; respawnY = Math.random() * 100; break; // โยนไปขวาสุด
            case 2: respawnX = Math.random() * 100; respawnY = 120; break; // โยนไปล่างสุด
            case 3: respawnX = -20; respawnY = Math.random() * 100; break; // โยนไปซ้ายสุด
          }
          // คืนค่าเหยี่ยวตัวเดิม แต่จับเปลี่ยนพิกัด X, Y
          return { ...enemy, x: respawnX, y: respawnY, direction: currentDirection };
        }

        return { ...enemy, x: newX, y: newY, direction: currentDirection };
      }).filter(Boolean));

    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, charPos, playSound, endGame]);

  // Spawn loops
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const spawnEnemyInt = setInterval(() => spawnEnemy(), Math.max(5000 - (score * 200), 2000));
    return () => { clearInterval(spawnEnemyInt); };
  }, [gameState, score, spawnEnemy]);

  if (!isClient) return null;

  return (
    <div className={`h-screen w-full relative overflow-hidden select-none ${shake ? 'animate-shake' : ''}`}>

      {/* 1. BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <img src="/bg.png" alt="Background" className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.className = 'absolute inset-0 bg-slate-800'; }} />
      </div>

      {/* 2. GAME AREA */}
      <div className="absolute inset-0 z-10">
        {/* ตัวละครนก 🦅 */}
        {(gameState === 'PLAYING' || gameState === 'QUIZ') && (
          <div className="absolute w-20 h-20 md:w-24 md:h-24 transition-all duration-100 ease-out z-30 drop-shadow-2xl"
            style={{
              left: `${charPos.x}%`, top: `${charPos.y}%`,
              transform: `translate(-50%, -50%) ${direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)'} ${isMoving ? 'scale(1.1)' : 'scale(1)'}`
            }}>
            <div className="relative w-full h-full animate-[bounce_3s_ease-in-out_infinite]">
              <img src="/bird.png" alt="Hero" className="w-full h-full object-contain drop-shadow-lg"
                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div class="text-5xl md:text-6xl">🦅</div>'; }} />
            </div>
          </div>
        )}

        {/* ศัตรู 🦅 (นักล่าวิ่งไล่) */}
        {gameState === 'PLAYING' && enemies.map(enemy => (
          // 👇 เปลี่ยนขนาดตรงนี้เป็น w-28 h-28 และจอใหญ่เป็น w-36 h-36 👇
          <div key={enemy.id} className="absolute w-28 h-28 md:w-36 md:h-36 z-25 transition-all duration-100"
            style={{ left: `${enemy.x}%`, top: `${enemy.y}%`, transform: `translate(-50%, -50%) scaleX(${enemy.direction === 'left' ? '1' : '-1'})` }}>
            <div className="relative w-full h-full animate-bounce">
              <img src="/enemy.png" alt="Enemy" className="w-full h-full object-contain drop-shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="text-5xl md:text-6xl drop-shadow-2xl flex items-center justify-center">🦅</div>';
                }} />
            </div>
          </div>
        ))}

        {/* สิ่งกีดขวาง (บล็อคทาง) 🧱 */}
        {gameState === 'PLAYING' && obstacles.map(obs => (
          <div key={obs.id} className="absolute w-16 h-16 md:w-20 md:h-20 z-20"
            style={{ left: `${obs.x}%`, top: `${obs.y}%`, transform: `translate(-50%, -50%)` }}>
            <div className="relative w-full h-full">
              <img src="/block.png" alt="Block" className="w-full h-full object-contain drop-shadow-xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="text-5xl md:text-6xl drop-shadow-2xl flex items-center justify-center">🧱</div>';
                }} />
            </div>
          </div>
        ))}

        {/* หนอน 🐛 (โจทย์ถัดไป) */}
        {(gameState === 'PLAYING' || gameState === 'QUIZ') && (
          <div className="absolute w-16 h-16 md:w-20 md:h-20 z-20 animate-bounce-rotate"
            style={{ left: `${wormPos.x}%`, top: `${wormPos.y}%`, transform: 'translate(-50%, -50%)' }}>
            <div className="relative w-full h-full animate-pulse-glow rounded-full">
              <img src="/worm.png" alt="Worm" className="w-full h-full object-contain drop-shadow-2xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="text-5xl md:text-6xl">🐛</div>';
                }} />
            </div>
          </div>
        )}
      </div>

      {/* 3. TOP HUD */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="glass-btn px-5 py-2.5 text-sm font-bold">🏆 สูงสุด: {highScore}</div>
          {playerName && <div className="glass-btn px-4 py-2 text-xs font-semibold">👤 {playerName}</div>}
          {combo > 1 && gameState === 'PLAYING' && <div className="score-badge text-sm animate-pulse-glow">🔥 Combo x{combo}</div>}
        </div>
        <div className="flex gap-3 pointer-events-auto items-center">

          {/* 👇 ปุ่มเปิด-ปิดเสียง 👇 */}
          <button
            onClick={toggleSound}
            className="glass-btn px-3 py-1.5 text-xl hover:scale-110 transition-transform cursor-pointer"
            title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {(gameState === 'PLAYING' || gameState === 'QUIZ') && (
            <>
              <div className="score-badge text-lg">⭐ {score}</div>
              <div className="heart-badge text-lg">{'❤️'.repeat(Math.max(0, hearts))}</div>
            </>
          )}
        </div>
      </div>

      {/* 4. MODALS & OVERLAYS */}
      {gameState === 'START' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md z-50 p-4">
          <div className="glass-effect p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border-4 border-white/30 animate-pop">
            <div className="text-6xl md:text-7xl mb-4 animate-bounce">🎮</div>
            <h1 className="text-3xl md:text-4xl font-black mb-6 leading-snug bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]">
              เกมคณิตศาสตร์ : ผจญภัยอัตราส่วน
            </h1>
            <input type="text" placeholder="ใส่ชื่อฮีโร่..." value={playerName}
              className="w-full glass-effect p-4 rounded-2xl text-center text-xl font-bold mb-6 outline-none focus:border-yellow-400 transition-all text-white placeholder-white/50"
              onChange={e => setPlayerName(e.target.value)} onKeyPress={e => e.key === 'Enter' && startGame()} maxLength={15} autoFocus />
            <div className="flex flex-col gap-3">
              <button onClick={startGame} disabled={!playerName.trim()} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-4 rounded-2xl font-bold text-xl shadow-2xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95">เริ่มเกมเลย! 🚀</button>
              <button onClick={() => setGameState('LEADERBOARD')} className="glass-btn w-full py-3 font-bold text-lg text-white/80 hover:text-white hover:bg-white/20">📊 ดูอันดับคะแนน</button>
            </div>
          </div>
        </div>
      )}

      {/* QUIZ MODAL */}
      {gameState === 'QUIZ' && question && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 p-4">
          <div className={`glass-effect w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border-4 ${flashCorrect ? 'border-green-400 bg-green-500/20' : 'border-white/30'} animate-pop`}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 relative">
              <div className="absolute top-4 right-4 bg-red-500/90 backdrop-blur px-4 py-2 rounded-full font-bold text-xl animate-pulse border-2 border-white/30">⏰ {timeLeft}s</div>
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg mb-2">{question.text}</h2>
                {combo > 0 && <div className="text-yellow-300 font-bold text-sm animate-bounce">🔥 Combo x{combo}</div>}
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3 bg-gradient-to-b from-white/5 to-white/10">
              {question.choices.map((choice, idx) => {
                const isSelected = selectedAnswer === choice;
                const isCorrect = choice === question.correct;
                const showCorrectness = showResult && isSelected;
                return (
                  <button key={idx} onClick={() => !showResult && handleAnswer(choice)} disabled={showResult}
                    className={`glass-effect py-6 rounded-2xl text-3xl font-black transition-all ${!showResult && 'hover:scale-105 hover:bg-white/20 active:scale-95'} ${showCorrectness && isCorrect && 'bg-green-500/40 border-green-400 scale-110'} ${showCorrectness && !isCorrect && 'bg-red-500/40 border-red-400 animate-shake'} ${showResult && isCorrect && !isSelected && 'bg-green-500/20 border-green-400/50'}`}>
                    <div className="text-white drop-shadow-lg">{choice}</div>
                  </button>
                );
              })}
            </div>
            {showResult && (
              <div className={`p-4 text-center font-bold text-lg ${selectedAnswer === question.correct ? 'text-green-300' : 'text-red-300'} animate-pop`}>
                {selectedAnswer === question.correct ? <>🎉 ถูกต้อง! +1 คะแนน</> : <>💔 ผิดแล้ว! คำตอบคือ {question.correct}</>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAUSED */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-lg z-50">
          <div className="glass-effect p-10 rounded-3xl text-center border-4 border-white/30 animate-pop">
            <div className="text-6xl mb-4">⏸️</div>
            <h2 className="text-4xl font-black text-white mb-6">หยุดพักก่อน</h2>
            <button onClick={() => setGameState('PLAYING')} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all hover:scale-105">▶️ เล่นต่อ</button>
          </div>
        </div>
      )}

      {/* GAMEOVER */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg z-50 p-4">
          <div className="glass-effect p-8 md:p-10 rounded-3xl text-center max-w-md w-full border-4 border-red-300/30 animate-pop">
            <div className="text-7xl mb-4 animate-bounce">{score > highScore ? '🏆' : '💀'}</div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-2">{score > highScore ? 'สถิติใหม่!' : 'Game Over!'}</h2>
            <div className="glass-effect p-6 rounded-2xl mb-6 border-2 border-white/20">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div><p className="text-white/60 text-sm font-bold uppercase">คะแนน</p><p className="text-5xl font-black text-yellow-300 drop-shadow-lg">{score}</p></div>
                <div><p className="text-white/60 text-sm font-bold uppercase">สูงสุด</p><p className="text-5xl font-black text-pink-300 drop-shadow-lg">{highScore}</p></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={resetGame} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-2xl font-bold text-lg shadow-2xl transition-all hover:scale-105">🔄 เล่นอีกครั้ง</button>
              <button onClick={() => setGameState('START')} className="flex-1 glass-btn py-4 font-bold text-lg">🏠 หน้าแรก</button>
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      {gameState === 'LEADERBOARD' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg z-50 p-4">
          <div className="glass-effect p-6 md:p-8 rounded-3xl max-w-2xl w-full border-4 border-purple-300/30 animate-pop max-h-[90vh] overflow-y-auto pointer-events-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><div className="text-5xl">📊</div><h2 className="text-3xl md:text-4xl font-black text-white">Leaderboard</h2></div>
              <div className="flex gap-2">
                <button onClick={loadLeaderboard} disabled={loadingLeaderboard} className="glass-btn px-4 py-2 text-sm font-bold hover:bg-white/30 disabled:opacity-50 cursor-pointer">{loadingLeaderboard ? '⏳' : '🔄'} Refresh</button>
                <button onClick={() => setGameState('START')} className="glass-btn px-4 py-2 text-sm font-bold hover:bg-white/30 cursor-pointer">✕ ปิด</button>
              </div>
            </div>

            {loadingLeaderboard ? (
              <div className="text-center py-12"><div className="text-6xl mb-4 animate-bounce">⏳</div><p className="text-xl font-bold text-white">กำลังโหลด...</p></div>
            ) : (
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-white/60"><div className="text-6xl mb-4">🎮</div><p className="text-xl font-bold">ยังไม่มีคะแนน</p></div>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div key={entry.id || index} className={`glass-effect p-4 rounded-2xl border-2 transition-all hover:scale-102 ${index === 0 ? 'border-yellow-400/50 bg-yellow-500/10' : index === 1 ? 'border-gray-300/50 bg-gray-500/10' : index === 2 ? 'border-orange-400/50 bg-orange-500/10' : 'border-white/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl font-black">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</div>
                          <div className="text-left"><p className="font-black text-white text-lg">{entry.name}</p><div className="flex items-center gap-2 text-xs text-white/60"><span>{new Date(entry.timestamp || entry.createdAt?.toDate?.() || Date.now()).toLocaleDateString('th-TH')}</span>{entry.combo > 1 && <span>🔥 x{entry.combo}</span>}</div></div>
                        </div>
                        <div className="text-right"><p className="text-3xl font-black text-yellow-300">{entry.score}</p><p className="text-xs text-white/60">คะแนน</p></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PARTICLE EFFECTS */}
      {particles.map(p => (
        <div key={p.id} className="absolute text-2xl pointer-events-none z-[60] animate-bounce" style={{ left: `${p.x}%`, top: `${p.y}%`, animation: 'confetti 2s ease-out forwards' }}>{p.emoji}</div>
      ))}

      {/* MOBILE CONTROLS */}
      {gameState === 'PLAYING' && (
        <div className="fixed bottom-4 left-4 z-40 lg:hidden pointer-events-auto">
          <div className="grid grid-cols-3 gap-2">
            <div className="w-16 h-16" />
            <button className="dpad-btn" onTouchStart={(e) => { e.preventDefault(); moveCharacter('up'); }} onClick={(e) => { e.preventDefault(); moveCharacter('up'); }}>⬆️</button>
            <div className="w-16 h-16" />
            <button className="dpad-btn" onTouchStart={(e) => { e.preventDefault(); moveCharacter('left'); }} onClick={(e) => { e.preventDefault(); moveCharacter('left'); }}>⬅️</button>
            <div className="w-16 h-16" />
            <button className="dpad-btn" onTouchStart={(e) => { e.preventDefault(); moveCharacter('right'); }} onClick={(e) => { e.preventDefault(); moveCharacter('right'); }}>➡️</button>
            <div className="w-16 h-16" />
            <button className="dpad-btn" onTouchStart={(e) => { e.preventDefault(); moveCharacter('down'); }} onClick={(e) => { e.preventDefault(); moveCharacter('down'); }}>⬇️</button>
            <div className="w-16 h-16" />
          </div>
        </div>
      )}
    </div>
  );
}