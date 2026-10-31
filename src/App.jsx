
import { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [phase, setPhase] = useState("waiting");
  const [cashedOut, setCashedOut] = useState(false);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("READY FOR TAKEOFF!");

  useEffect(() => {
    if (phase !== "flying") return;

    const start = Date.now();
    let stopped = false;

    const timer = setInterval(() => {
      if (stopped) return;

      const elapsed = (Date.now() - start) / 1000;
      const next = Math.pow(1.12, elapsed);
      const crashAt = window.currentCrash;

      if (next >= crashAt) {
        stopped = true;
        clearInterval(timer);
        setMultiplier(crashAt);
        setPhase("crashed");
        setMessage(cashedOut ? "YOU WON!" : "FLIGHT CRASHED!");

        setHistory(old => [
          { value: crashAt, result: cashedOut ? "WIN" : "LOSS" },
          ...old
        ].slice(0, 8));
      } else {
        setMultiplier(next);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [phase, cashedOut]);

  function startGame() {
    if (phase === "flying") return;

    if (!Number.isFinite(bet) || bet <= 0 || bet > balance) {
      setMessage("INVALID BET!");
      return;
    }

    window.currentCrash = 1.2 + Math.random() * 7;
    setBalance(old => old - bet);
    setMultiplier(1);
    setCashedOut(false);
    setMessage("THE PLANE IS FLYING!");
    setPhase("flying");
  }

  function cashOut() {
    if (phase !== "flying" || cashedOut) return;

    setBalance(old => old + bet * multiplier);
    setCashedOut(true);
    setMessage("CASHED OUT AT " + multiplier.toFixed(2) + "x");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">✈ AVIATOR <span>GOLD</span></div>
        <div className="wallet">
          <small>YOUR DEMO BALANCE</small>
          <strong>{balance.toFixed(2)} MAD</strong>
        </div>
      </header>

      <main>
        <div className="game">
          <div className="heading">
            <span>● LIVE DEMO</span>
            <span>AVIATOR GOLD</span>
          </div>

          <div className={"sky " + phase}>
            <div className="multiplier">
              {multiplier.toFixed(2)}x
            </div>
            <div className="plane">
              {phase === "crashed" ? "💥" : "✈️"}
            </div>
            <div className="line"></div>
            <p className="message">{message}</p>
          </div>

          <div className="controls">
            <label>BET AMOUNT (MAD)</label>
            <input
              type="number"
              min="1"
              value={bet}
              disabled={phase === "flying"}
              onChange={e => setBet(Number(e.target.value))}
            />

            {phase === "flying" ? (
              <button
                className="cashout"
                disabled={cashedOut}
                onClick={cashOut}
              >
                {cashedOut ? "CASHED OUT ✓" : "CASH OUT"}
              </button>
            ) : (
              <button className="play" onClick={startGame}>
                ▶ PLAY
              </button>
            )}
          </div>
        </div>

        <section className="history">
          <h2>ROUND HISTORY</h2>
          {history.length === 0 && <p>No rounds yet</p>}
          {history.map((item, i) => (
            <div className="history-item" key={i}>
              <span>{item.result}</span>
              <strong>{item.value.toFixed(2)}x</strong>
            </div>
          ))}
        </section>

        <footer>
          AVIATOR GOLD © 2026
          <p>DEMO CREDITS ONLY — NO REAL MONEY</p>
        </footer>
      </main>
    </div>
  );
}
