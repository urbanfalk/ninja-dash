
import React, { useEffect, useMemo, useRef, useState } from "react";

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 420;
const GRAVITY = 0.75;
const MOVE_SPEED = 4.5;
const JUMP_POWER = -12.9;
const MAX_LIVES = 3;
const MIN_X = 60;
const CRASH_RECOVERY_MS = 650;
const INVULNERABLE_AFTER_RESPAWN_MS = 900;

const level = {
  playerStart: { x: 60, y: 280 },
  goal: { x: 2060, y: 255, w: 58, h: 85 },
  platforms: [
    { x: 0, y: 340, w: 340, h: 80 },
    { x: 430, y: 310, w: 140, h: 20 },
    { x: 650, y: 280, w: 130, h: 20 },
    { x: 860, y: 250, w: 150, h: 20 },
    { x: 1100, y: 310, w: 170, h: 20 },
    { x: 1380, y: 280, w: 150, h: 20 },
    { x: 1600, y: 250, w: 140, h: 20 },
    { x: 1830, y: 290, w: 180, h: 20 },
    { x: 2010, y: 340, w: 190, h: 80 },
  ],
  flames: [
    { x: 340, y: 332, w: 72, h: 40 },
    { x: 570, y: 332, w: 58, h: 40 },
    { x: 790, y: 332, w: 58, h: 40 },
    { x: 1030, y: 332, w: 58, h: 40 },
    { x: 1285, y: 332, w: 72, h: 40 },
    { x: 1545, y: 332, w: 45, h: 40 },
    { x: 1755, y: 332, w: 58, h: 40 },
  ],
};

const createPlayer = () => ({
  x: level.playerStart.x,
  y: level.playerStart.y,
  w: 34,
  h: 60,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
});

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mixColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);

  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);

  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);

  return `rgb(${rr}, ${rg}, ${rb})`;
}

function FlameHazard({ flame, paused }) {
  const count = Math.max(3, Math.floor(flame.w / 18));

  return (
    <div
      style={{
        position: "absolute",
        left: flame.x,
        top: flame.y,
        width: flame.w,
        height: flame.h,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 2,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const height = 18 + (i % 3) * 7;
        const duration = 0.45 + (i % 4) * 0.1;
        const delay = i * 0.08;
        return (
          <div
            key={i}
            style={{
              position: "relative",
              width: 14,
              height,
              animation: `flameFlicker ${duration}s ease-in-out ${delay}s infinite alternate`,
              animationPlayState: paused ? "paused" : "running",
              transformOrigin: "bottom center",
              filter: "drop-shadow(0 0 6px rgba(255,120,0,0.8))",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, #ff3b00 0%, #ff7a00 40%, #ffd54a 80%, rgba(255,255,255,0.92) 100%)",
                borderRadius: "50% 50% 40% 40% / 65% 65% 35% 35%",
                clipPath: "polygon(50% 0%, 78% 22%, 100% 58%, 72% 100%, 28% 100%, 0% 58%, 22% 22%)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function RealisticNinja({ player, running, paused, invulnerable }) {
  return (
    <div
      style={{
        position: "absolute",
        left: player.x,
        top: player.y,
        width: player.w,
        height: player.h,
        transform: player.facing === -1 ? "scaleX(-1)" : "none",
        transformOrigin: "center center",
        opacity: invulnerable ? 0.72 : 1,
        filter: invulnerable
          ? "drop-shadow(0 0 12px rgba(255,255,255,0.2))"
          : "drop-shadow(0 0 10px rgba(255,255,255,0.08))",
      }}
    >
      {/* back arm */}
      <div
        style={{
          position: "absolute",
          left: 6,
          top: 24,
          width: 6,
          height: 20,
          background: "linear-gradient(to bottom, #2b2b2b, #0b0b0b)",
          borderRadius: 4,
          transformOrigin: "top center",
          transform: running ? "rotate(28deg)" : "rotate(8deg)",
          animation: running ? "armSwingBack 0.28s infinite alternate" : "none",
          animationPlayState: paused ? "paused" : "running",
        }}
      />

      {/* body */}
      <div
        style={{
          position: "absolute",
          left: 9,
          top: 16,
          width: 16,
          height: 24,
          background: "linear-gradient(to bottom, #2a2a2a, #050505)",
          borderRadius: "6px 6px 5px 5px",
          boxShadow:
            "inset 0 0 8px rgba(255,255,255,0.04), inset 0 -8px 10px rgba(0,0,0,0.28)",
          border: "1px solid #1f1f1f",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 6,
            top: 3,
            width: 4,
            height: 14,
            background: "rgba(180,20,20,0.30)",
            borderRadius: 5,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 3,
            top: 10,
            width: 10,
            height: 1,
            background: "rgba(255,255,255,0.08)",
          }}
        />
      </div>

      {/* front arm */}
      <div
        style={{
          position: "absolute",
          right: 6,
          top: 24,
          width: 6,
          height: 20,
          background: "linear-gradient(to bottom, #2b2b2b, #0b0b0b)",
          borderRadius: 4,
          transformOrigin: "top center",
          transform: running ? "rotate(-26deg)" : "rotate(-8deg)",
          animation: running ? "armSwingFront 0.28s infinite alternate" : "none",
          animationPlayState: paused ? "paused" : "running",
        }}
      />

      {/* head */}
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 0,
          width: 18,
          height: 18,
          background: "linear-gradient(to bottom, #202020, #060606)",
          borderRadius: "8px 8px 6px 6px",
          border: "1px solid #222",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.06), transparent 40%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 2,
            top: 7,
            width: 14,
            height: 4,
            background: "#111",
            borderRadius: 3,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 2,
              top: 1,
              width: 3,
              height: 2,
              background: "#ff4836",
              borderRadius: 99,
              boxShadow: "0 0 5px rgba(255,72,54,0.7)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 2,
              top: 1,
              width: 3,
              height: 2,
              background: "#ff4836",
              borderRadius: 99,
              boxShadow: "0 0 5px rgba(255,72,54,0.7)",
            }}
          />
        </div>
      </div>

      {/* belt flap */}
      <div
        style={{
          position: "absolute",
          left: 13,
          top: 36,
          width: 8,
          height: 6,
          background: "#1b1b1b",
          borderRadius: 2,
        }}
      />

      {/* legs */}
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 39,
          width: 6,
          height: 20,
          background: "linear-gradient(to bottom, #1a1a1a, #050505)",
          borderRadius: 4,
          transformOrigin: "top center",
          animation: running ? "legSwingBack 0.28s infinite alternate" : "none",
          animationPlayState: paused ? "paused" : "running",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 18,
          top: 39,
          width: 6,
          height: 20,
          background: "linear-gradient(to bottom, #1a1a1a, #050505)",
          borderRadius: 4,
          transformOrigin: "top center",
          animation: running ? "legSwingFront 0.28s infinite alternate" : "none",
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </div>
  );
}

export default function App() {
  const animationRef = useRef(null);
  const directionRef = useRef(0);

  const musicRef = useRef(null);
  const spikeSoundRef = useRef(null);
  const goalSoundRef = useRef(null);

  const audioStartedRef = useRef(false);
  const crashLockRef = useRef(false);
  const wonRef = useRef(false);
  const gameOverRef = useRef(false);
  const hasPlayedGoalSoundRef = useRef(false);
  const crashTimeoutRef = useRef(null);
  const invulnerableUntilRef = useRef(0);
  const pausedRef = useRef(false);
  const platformPhaseRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  const [player, setPlayer] = useState(createPlayer());
  const [status, setStatus] = useState("Väntar på start");
  const [deaths, setDeaths] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [musicPausedByUser, setMusicPausedByUser] = useState(false);
  const [platformPhase, setPlatformPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const [invulnerable, setInvulnerable] = useState(false);

  useEffect(() => {
    wonRef.current = won;
  }, [won]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const stopAllAudio = () => {
    [musicRef.current, spikeSoundRef.current, goalSoundRef.current].forEach((audio) => {
      if (audio) {
        audio.pause();
      }
    });
  };

  const tryStartMusic = () => {
    if (
      !musicRef.current ||
      !started ||
      wonRef.current ||
      gameOverRef.current ||
      musicPausedByUser ||
      pausedRef.current
    ) {
      return;
    }

    musicRef.current.volume = 0.35;
    musicRef.current.loop = true;
    musicRef.current.play().catch(() => {});
  };

  const startAudioIfNeeded = () => {
    if (!audioStartedRef.current) {
      audioStartedRef.current = true;
    }
  };

  const playSpikeSound = () => {
    if (!spikeSoundRef.current || pausedRef.current) return;
    spikeSoundRef.current.pause();
    spikeSoundRef.current.currentTime = 0;
    spikeSoundRef.current.volume = 0.95;
    spikeSoundRef.current.play().catch(() => {});
  };

  const playGoalSound = () => {
    if (!goalSoundRef.current || pausedRef.current) return;
    goalSoundRef.current.pause();
    goalSoundRef.current.currentTime = 0;
    goalSoundRef.current.volume = 0.95;
    goalSoundRef.current.play().catch(() => {});
  };

  const resetPlayerPosition = () => {
    setPlayer(createPlayer());
  };

  const clearCrashTimeout = () => {
    if (crashTimeoutRef.current) {
      clearTimeout(crashTimeoutRef.current);
      crashTimeoutRef.current = null;
    }
  };

  const resetWholeGameToStartScreen = () => {
    clearCrashTimeout();
    directionRef.current = 0;
    crashLockRef.current = false;
    wonRef.current = false;
    gameOverRef.current = false;
    hasPlayedGoalSoundRef.current = false;
    invulnerableUntilRef.current = 0;
    lastFrameTimeRef.current = 0;

    setPlayer(createPlayer());
    setStatus("Väntar på start");
    setDeaths(0);
    setLives(MAX_LIVES);
    setWon(false);
    setGameOver(false);
    setStarted(false);
    setMusicPausedByUser(false);
    setPlatformPhase(0);
    setPaused(false);
    setInvulnerable(false);

    stopAllAudio();
    if (musicRef.current) {
      musicRef.current.currentTime = 0;
    }
  };

  const triggerCrash = () => {
    const now = performance.now();

    if (
      crashLockRef.current ||
      wonRef.current ||
      gameOverRef.current ||
      !started ||
      pausedRef.current ||
      now < invulnerableUntilRef.current
    ) {
      return;
    }

    crashLockRef.current = true;
    directionRef.current = 0;
    clearCrashTimeout();

    playSpikeSound();
    setDeaths((d) => d + 1);

    setLives((prevLives) => {
      const nextLives = prevLives - 1;

      if (nextLives <= 0) {
        setGameOver(true);
        setStatus("Game Over");
        stopAllAudio();
        return 0;
      }

      setStatus(`Aj! ${nextLives} liv kvar`);

      crashTimeoutRef.current = setTimeout(() => {
        resetPlayerPosition();
        invulnerableUntilRef.current = performance.now() + INVULNERABLE_AFTER_RESPAWN_MS;
        setInvulnerable(true);
        directionRef.current = 1;
        crashLockRef.current = false;
      }, CRASH_RECOVERY_MS);

      return nextLives;
    });
  };

  const startGame = () => {
    clearCrashTimeout();
    audioStartedRef.current = true;
    directionRef.current = 1;
    crashLockRef.current = false;
    wonRef.current = false;
    gameOverRef.current = false;
    hasPlayedGoalSoundRef.current = false;
    invulnerableUntilRef.current = 0;
    lastFrameTimeRef.current = 0;

    setPlayer(createPlayer());
    setStatus("Spring!");
    setDeaths(0);
    setLives(MAX_LIVES);
    setWon(false);
    setGameOver(false);
    setStarted(true);
    setMusicPausedByUser(false);
    setPlatformPhase(0);
    setPaused(false);
    setInvulnerable(false);

    if (musicRef.current) {
      musicRef.current.currentTime = 0;
    }

    setTimeout(() => {
      tryStartMusic();
    }, 0);
  };

  const restartGame = () => {
    resetWholeGameToStartScreen();
  };

  useEffect(() => {
    const loop = (timestamp) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }
      const deltaMs = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      if (!pausedRef.current && started && !wonRef.current && !gameOverRef.current) {
        platformPhaseRef.current += deltaMs * 0.0022;
        setPlatformPhase(platformPhaseRef.current);
      }

      const now = performance.now();
      if (now >= invulnerableUntilRef.current && invulnerable) {
        setInvulnerable(false);
      }

      setPlayer((prev) => {
        if (
          !started ||
          wonRef.current ||
          gameOverRef.current ||
          crashLockRef.current ||
          pausedRef.current
        ) {
          return prev;
        }

        let next = { ...prev };

        const intendedDirection = directionRef.current > 0 ? 1 : 0;
        next.vx = intendedDirection * MOVE_SPEED;

        if (intendedDirection !== 0) {
          next.facing = intendedDirection;
        }

        next.vy += GRAVITY;
        next.x += next.vx;

        if (next.x < MIN_X) {
          next.x = MIN_X;
          next.vx = 0;
        }

        const futureXRect = { x: next.x, y: next.y, w: next.w, h: next.h };
        for (const p of level.platforms) {
          if (rectsOverlap(futureXRect, p)) {
            if (next.vx > 0) next.x = p.x - next.w;
          }
        }

        next.y += next.vy;
        next.onGround = false;

        const futureYRect = { x: next.x, y: next.y, w: next.w, h: next.h };
        for (const p of level.platforms) {
          if (rectsOverlap(futureYRect, p)) {
            if (prev.y + prev.h <= p.y && next.vy >= 0) {
              next.y = p.y - next.h;
              next.vy = 0;
              next.onGround = true;
            } else if (prev.y >= p.y + p.h && next.vy < 0) {
              next.y = p.y + p.h;
              next.vy = 0;
            }
          }
        }

        if (next.y > WORLD_HEIGHT + 120) {
          triggerCrash();
          return prev;
        }

        // mindre, mer rättvis hitbox för att minska dubbel/för tidiga träffar
        const hurtBox = {
          x: next.x + 6,
          y: next.y + 8,
          w: next.w - 12,
          h: next.h - 10,
        };

        for (const flame of level.flames) {
          const flameHitBox = {
            x: flame.x + 4,
            y: flame.y + 6,
            w: flame.w - 8,
            h: flame.h - 8,
          };

          if (rectsOverlap(hurtBox, flameHitBox)) {
            triggerCrash();
            return prev;
          }
        }

        
     if (rectsOverlap(hurtBox, level.goal)) {
  if (!hasPlayedGoalSoundRef.current) {
    hasPlayedGoalSoundRef.current = true;
    playGoalSound();
    setWon(true);
    setStatus("Du klarade banan!");
    directionRef.current = 0;
  }
  return next;
}     

        return next;
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearCrashTimeout();
      stopAllAudio();
    };
  }, [started, musicPausedByUser, invulnerable]);

  const cameraX = useMemo(() => {
    const raw = player.x - 420;
    return Math.max(0, Math.min(raw, WORLD_WIDTH - 860));
  }, [player.x]);

  const stopMove = () => {
    directionRef.current = 0;
    setMusicPausedByUser(true);
    setPaused(true);
    stopAllAudio();
    setStatus(
      won
        ? "Du klarade banan!"
        : gameOver
        ? "Game Over"
        : started
        ? "Stoppad"
        : "Väntar på start"
    );
  };

  const jump = () => {
    if (!started || gameOver || won || crashLockRef.current || paused) return;
    startAudioIfNeeded();

    if (!musicPausedByUser) {
      setTimeout(() => tryStartMusic(), 0);
    }

    setPlayer((prev) => {
      if (!prev.onGround) return prev;

      return {
        ...prev,
        vy: JUMP_POWER,
        onGround: false,
      };
    });

    setStatus("Hopp!");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 10%, #1a1a1a 0%, #0a0a0a 38%, #050505 100%)",
        color: "#f4f4f5",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <style>{`
        @keyframes flameFlicker {
          0% { transform: scaleY(0.92) rotate(-2deg); opacity: 0.88; }
          50% { transform: scaleY(1.08) rotate(2deg); opacity: 1; }
          100% { transform: scaleY(0.96) rotate(-1deg); opacity: 0.9; }
        }

        @keyframes portalPulse {
          0% { box-shadow: 0 0 14px rgba(120, 185, 255, 0.35); }
          100% { box-shadow: 0 0 28px rgba(120, 185, 255, 0.7); }
        }

        @keyframes armSwingFront {
          0% { transform: rotate(-26deg); }
          100% { transform: rotate(18deg); }
        }

        @keyframes armSwingBack {
          0% { transform: rotate(24deg); }
          100% { transform: rotate(-18deg); }
        }

        @keyframes legSwingFront {
          0% { transform: rotate(-18deg); }
          100% { transform: rotate(20deg); }
        }

        @keyframes legSwingBack {
          0% { transform: rotate(18deg); }
          100% { transform: rotate(-20deg); }
        }
      `}</style>

      <audio ref={musicRef} src="/sounds/music.mp3" preload="auto" />
      <audio ref={spikeSoundRef} src="/sounds/spike.mp3" preload="auto" />
      <audio ref={goalSoundRef} src="/sounds/goal.mp3" preload="auto" />

      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 42 }}>Ninja Dash</h1>
            <p style={{ marginTop: 8, color: "#a1a1aa" }}>
              Klicka i spelrutan för att hoppa över eldarna.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                padding: "10px 14px",
                borderRadius: 16,
              }}
            >
              Status: {status}
            </div>

            <div
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                padding: "10px 14px",
                borderRadius: 16,
              }}
            >
              Liv: {lives}
            </div>

            <div
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                padding: "10px 14px",
                borderRadius: 16,
              }}
            >
              Crashar: {deaths}
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 24,
            overflow: "hidden",
            border: "1px solid #27272a",
            background: "#000",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 860,
              height: 420,
              margin: "0 auto",
              overflow: "hidden",
              background:
                "linear-gradient(to bottom, #060606 0%, #101010 35%, #111111 60%, #0b0b0b 100%)",
              cursor: gameOver ? "not-allowed" : "crosshair",
            }}
            onClick={jump}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 75% 18%, rgba(255,255,255,0.06), transparent 18%), radial-gradient(circle at 15% 20%, rgba(255,255,255,0.05), transparent 15%), radial-gradient(circle at 45% 15%, rgba(255,255,255,0.03), transparent 12%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(255,80,0,0.06), transparent 20%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                transform: `translateX(${-cameraX}px)`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 80,
                  top: 78,
                  color: "#2a2a2a",
                  fontSize: 140,
                }}
              >
                ☾
              </div>

              <div
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 118,
                  width: WORLD_WIDTH,
                  height: 110,
                  background:
                    "linear-gradient(to top, #111, transparent), repeating-linear-gradient(120deg, #141414 0 80px, #101010 80px 160px)",
                  clipPath:
                    "polygon(0% 100%, 8% 70%, 14% 82%, 22% 52%, 28% 76%, 36% 45%, 44% 80%, 52% 58%, 60% 84%, 69% 44%, 76% 76%, 84% 54%, 92% 80%, 100% 60%, 100% 100%)",
                  opacity: 0.6,
                }}
              />

              {level.platforms.map((platform, i) => {
                const t = (Math.sin(platformPhase + i * 0.9) + 1) / 2;
                const topColor = mixColor("#e23d61", "#b46cff", t);
                const bodyColor = mixColor("#5b1027", "#35125c", t);
                const glowColor = mixColor("#b83657", "#8f52ff", t);

                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: platform.x,
                      top: platform.y,
                      width: platform.w,
                      height: platform.h,
                      background: `linear-gradient(to bottom, ${topColor}, ${bodyColor})`,
                      borderTop: `2px solid ${mixColor("#ff87a0", "#d5b2ff", t)}`,
                      boxShadow: `inset 0 8px 16px rgba(255,255,255,0.05), inset 0 -8px 16px rgba(0,0,0,0.25), 0 0 12px ${glowColor}44`,
                      transition: paused ? "none" : "background 0.08s linear, border-top-color 0.08s linear, box-shadow 0.08s linear",
                    }}
                  />
                );
              })}

              {level.flames.map((flame, i) => (
                <FlameHazard key={i} flame={flame} paused={paused} />
              ))}

              <div
                style={{
                  position: "absolute",
                  left: level.goal.x,
                  top: level.goal.y,
                  width: level.goal.w,
                  height: level.goal.h,
                  border: "2px solid #6ea8ff",
                  background:
                    "linear-gradient(to bottom, rgba(60,120,255,0.18), rgba(10,15,30,0.2))",
                  borderRadius: 8,
                  animation: "portalPulse 1s infinite alternate",
                  animationPlayState: paused ? "paused" : "running",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 7,
                    border: "1px solid rgba(180,220,255,0.8)",
                    borderRadius: 5,
                  }}
                />
              </div>

              <RealisticNinja
                player={player}
                running={directionRef.current === 1 && !crashLockRef.current}
                paused={paused}
                invulnerable={invulnerable}
              />

              {won && (
                <div
                  style={{
                    position: "absolute",
                    left: level.goal.x - 120,
                    top: 120,
                    color: "#c7e2ff",
                    fontWeight: "bold",
                    fontSize: 28,
                    textShadow: "0 0 12px rgba(110,168,255,0.8)",
                  }}
                >
                  Mål nått
                </div>
              )}

              {gameOver && (
                <div
                  style={{
                    position: "absolute",
                    left: cameraX + 245,
                    top: 105,
                    width: 370,
                    padding: "24px 20px",
                    borderRadius: 20,
                    background: "rgba(0,0,0,0.84)",
                    border: "2px solid #9b1c1c",
                    textAlign: "center",
                    boxShadow: "0 0 30px rgba(155,28,28,0.45)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: "bold",
                      color: "#ffb4b4",
                      marginBottom: 8,
                    }}
                  >
                    GAME OVER
                  </div>
                  <div style={{ color: "#d4d4d8", fontSize: 18 }}>
                    Ninjan klarade inte elden.
                  </div>
                </div>
              )}

              {!started && (
                <div
                  style={{
                    position: "absolute",
                    left: cameraX + 220,
                    top: 75,
                    width: 420,
                    padding: "28px 24px",
                    borderRadius: 24,
                    background: "rgba(0,0,0,0.88)",
                    border: "2px solid #3f3f46",
                    textAlign: "center",
                    boxShadow: "0 0 30px rgba(0,0,0,0.45)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 38,
                      fontWeight: "bold",
                      marginBottom: 10,
                      color: "#f4f4f5",
                    }}
                  >
                    Ninja Dash
                  </div>

                  <div
                    style={{
                      color: "#d4d4d8",
                      fontSize: 17,
                      lineHeight: 1.5,
                      marginBottom: 18,
                    }}
                  >
                    Ninjan börjar springa direkt. Klicka var som helst i spelrutan
                    för att hoppa över eldarna. Du har tre liv.
                  </div>

                  <button
                    onClick={startGame}
                    style={{
                      borderRadius: 16,
                      background: "#7f1d1d",
                      border: "1px solid #991b1b",
                      color: "#fff",
                      padding: "14px 22px",
                      fontSize: 22,
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Starta spelet
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              padding: 16,
              background: "#09090b",
              borderTop: "1px solid #27272a",
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={restartGame}
              style={{
                borderRadius: 16,
                background: "#27272a",
                border: "1px solid #3f3f46",
                color: "#fff",
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Starta om
            </button>

            <button
              onClick={stopMove}
              style={{
                borderRadius: 16,
                background: "#3f3f46",
                border: "1px solid #52525b",
                color: "#fff",
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Stoppa
            </button>

            <div
              style={{
                borderRadius: 16,
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#d4d4d8",
                padding: "10px 14px",
              }}
            >
              Styrning: tryck Starta spelet, sedan klickar du i spelrutan för att hoppa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}