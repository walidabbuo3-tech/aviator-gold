
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [phase, setPhase] = useState("waiting");
  const [cashedOut, setCashedOut] = useState(false);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("READY FOR TAKEOFF!");
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState(500);

  const startRef = useRef(Date.now());
  const crashRef = useRef(2);
  const cashoutRef = useRef(null);
  const betRef = useRef(10);

  const progress = Math.min(
    Math.max(Math.log(multiplier) / Math.log(10), 0),
    1
  );

  const t = Math.max(0, Math.min(progress, 1));

const p0 = { x: 5, y: 83 };
const p1 = { x: 25, y: 83 };
const p2 = { x: 65, y: 51 };
const p3 = { x: 91, y: 18 };

const x =
  Math.pow(1 - t, 3) * p0.x +
  3 * Math.pow(1 - t, 2) * t * p1.x +
  3 * (1 - t) * Math.pow(t, 2) * p2.x +
  Math.pow(t, 3) * p3.x;

const y =
  Math.pow(1 - t, 3) * p0.y +
  3 * Math.pow(1 - t, 2) * t * p1.y +
  3 * (1 - t) * Math.pow(t, 2) * p2.y +
  Math.pow(t, 3) * p3.y;

  
// Restore the current login session.
useEffect(() => {
  let alive = true;

  async function restoreSession() {
    const { data } = await supabase.auth.getSession();
    if (!alive) return;
    setUser(data.session?.user ?? null);
  }

  restoreSession();

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
    if (!session?.user) {
      setProfileLoaded(false);
      setBalance(1000);
      setHistory([]);
    }
  });

  return () => {
    alive = false;
    authListener.subscription.unsubscribe();
  };
}, []);

// Load the signed-in player's own saved data.
useEffect(() => {
  if (!user) return;
  let alive = true;
  setProfileLoaded(false);

  async function loadPlayerData() {
    const { data, error } = await supabase
      .from("player_data")
      .select("balance, history")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!alive) return;

    if (error) {
      setAuthMessage("Could not load player data: " + error.message);
      return;
    }

    if (data) {
      setBalance(Number(data.balance));
      setHistory(Array.isArray(data.history) ? data.history : []);
    } else {
      const { error: insertError } = await supabase
        .from("player_data")
        .insert({ user_id: user.id, balance: 1000, history: [] });

      if (!alive) return;
      if (insertError) {
        setAuthMessage("Could not create player data: " + insertError.message);
        return;
      }
      setBalance(1000);
      setHistory([]);
    }

    setProfileLoaded(true);
  }

  loadPlayerData();
  return () => { alive = false; };
}, [user]);

// Save balance and history to this player's row after loading is complete.
useEffect(() => {
  if (!user || !profileLoaded) return;

  const saveTimer = setTimeout(async () => {
    const { error } = await supabase
      .from("player_data")
      .update({ balance, history })
      .eq("user_id", user.id);

    if (error) setAuthMessage("Save error: " + error.message);
  }, 500);

  return () => clearTimeout(saveTimer);
}, [balance, history, user, profileLoaded]);

async function handleAuth(event) {
  event.preventDefault();
  setAuthBusy(true);
  setAuthMessage("");

  const result = authMode === "signup"
    ? await supabase.auth.signUp({ email, password })
    : await supabase.auth.signInWithPassword({ email, password });

  setAuthBusy(false);

  if (result.error) {
    setAuthMessage(result.error.message);
  } else if (authMode === "signup" && !result.data.session) {
    setAuthMessage("Account created. Check your email to confirm, then log in.");
  } else {
    setAuthMessage("Welcome!");
  }
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) setAuthMessage(error.message);
}

useEffect(() => {
  if (phase !== "flying") return;

  const timer = setInterval(() => {
    const elapsed = (Date.now() - startRef.current) / 1000;
    const next = Math.pow(1.12, elapsed);

    if (next >= crashRef.current) {
      clearInterval(timer);

      const won = cashoutRef.current !== null;
      const finalMultiplier = won
        ? cashoutRef.current
        : crashRef.current;

      const profit = won
        ? betRef.current * (finalMultiplier - 1)
        : -betRef.current;

      setMultiplier(finalMultiplier);
      setPhase("crashed");
      setMessage(won ? "YOU WON!" : "FLIGHT CRASHED!");

      setHistory((items) => [
        {
          id: Date.now(),
          value: finalMultiplier,
          result: won ? "WIN" : "LOSS",
          amount: profit
        },
        ...items
      ].slice(0, 12));
    } else {
      setMultiplier(next);
    }
  }, 40);

  return () => clearInterval(timer);
}, [phase]);


  function startGame() {
    if (phase === "flying") return;

    if (!Number.isFinite(bet) || bet <= 0 || bet > balance) {
      setMessage("INVALID BET!");
      return;
    }

    betRef.current = bet;
    cashoutRef.current = null;
    crashRef.current = 1.2 + Math.random() * 7.8;
    startRef.current = Date.now();

    setBalance((old) => old - bet);
    setMultiplier(1);
    setCashedOut(false);
    setMessage("THE PLANE IS FLYING!");
    setPhase("flying");
  }

  function cashOut() {
    if (phase !== "flying" || cashedOut) return;

    const payout = bet * multiplier;
    cashoutRef.current = multiplier;

    setBalance((old) => old + payout);
    setCashedOut(true);
    setMessage("CASHED OUT AT " + multiplier.toFixed(2) + "x");
  }

  function walletAction(type) {
    const amount = Number(walletAmount);

    if (!Number.isFinite(amount) || amount <= 0) return;

    if (type === "deposit") {
      setBalance((old) => old + amount);
      setMessage("DEMO CREDITS ADDED!");
    } else {
      if (amount > balance) {
        setMessage("NOT ENOUGH DEMO CREDITS!");
        return;
      }
      setBalance((old) => old - amount);
      setMessage("DEMO CREDITS WITHDRAWN!");
    }

    setWalletOpen(false);
  }

  if (!user) {
    return (
      <div className="app auth-screen">
        <section className="auth-card">
          <div className="logo">✈ AVIATOR <span>GOLD</span></div>
          <h1>{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p>Sign in to keep your demo balance and round history across devices.</p>
          <form onSubmit={handleAuth}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
            <button className="play-button" type="submit" disabled={authBusy}>
              {authBusy ? "PLEASE WAIT..." : authMode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
            </button>
          </form>
          <button className="auth-switch" onClick={() => {
            setAuthMode(authMode === "login" ? "signup" : "login");
            setAuthMessage("");
          }}>
            {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>
          {authMessage && <p className="auth-message">{authMessage}</p>}
          <small>DEMO CREDITS ONLY — NO REAL MONEY</small>
        </section>
      </div>
    );
  }

  if (!profileLoaded) {
    return <div className="app auth-screen"><p className="auth-message">{authMessage || "Loading your saved game..."}</p></div>;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <span className="logo-plane">✈</span>
          AVIATOR <span>GOLD</span>
        </div>

        <div className="live-pill">
          <i /> LIVE DEMO
        </div>
        <div className="account-area">
          <small>{user.email}</small>
          <button onClick={handleLogout}>LOG OUT</button>
        </div>

        <button className="wallet-card" onClick={() => setWalletOpen(true)}>
          <span className="wallet-icon">▣</span>
          <span>
            <small>Your Demo Balance</small>
            <strong>{balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} MAD</strong>
          </span>
          <b>+</b>
        </button>
      </header>

      <main>
        <div className="dashboard">
          <section className="game-panel">
            <div className="graph-labels">
              <span>10.0x</span>
              <span>8.0x</span>
              <span>6.0x</span>
              <span>4.0x</span>
              <span>2.0x</span>
              <span>1.0x</span>
            </div>

            <div className="sky">
              <div className="stars" />
              <div className="moon">☾</div>
              <div className="cloud cloud-one" />
              <div className="cloud cloud-two" />
              <div className="cloud cloud-three" />

              <div className="big-multiplier">
                {multiplier.toFixed(2)}x
              </div>

              <svg className="graph" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path className="graph-grid" d="
                  M0 10 H100 M0 25 H100 M0 40 H100
                  M0 55 H100 M0 70 H100 M0 85 H100
                  M10 0 V100 M25 0 V100 M40 0 V100
                  M55 0 V100 M70 0 V100 M85 0 V100
                " />
                <path
                  className="gold-path"
                  d="M 5 83 C 25 83, 65 51, 91 18"
                  pathLength="100"
                  style={{
                    strokeDasharray: 100,
                    strokeDashoffset: 100 - progress * 100
                  }}
                />
              </svg>

             <div
  className={`plane ${phase === "crashed" ? "plane-crashed" : ""}`}
  style={{
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%) rotate(-12deg)"
  }}
>
  <svg viewBox="0 0 160 100" aria-label="Red airplane">
    {/* Shadow */}
    <ellipse cx="78" cy="78" rx="48" ry="7" fill="#000" opacity=".25" />

    {/* Main wings */}
    <path
      d="M65 43 L27 17 L17 19 L43 52 L65 57 Z"
      fill="#8d1010"
      stroke="#ff5555"
      strokeWidth="2"
    />
    <path
      d="M65 53 L28 83 L19 81 L43 48 L65 43 Z"
      fill="#8d1010"
      stroke="#ff5555"
      strokeWidth="2"
    />

    {/* Tail */}
    <path
      d="M24 46 L8 29 L3 31 L13 52 L8 68 L14 70 L28 55 Z"
      fill="#b51b1b"
      stroke="#ff6666"
      strokeWidth="2"
    />

    {/* Airplane body */}
    <path
      d="M8 49 Q20 43 42 43 L120 45 Q137 47 151 51 Q137 57 120 59 L42 60 Q20 60 8 53 Z"
      fill="#e52626"
      stroke="#ff7777"
      strokeWidth="2"
    />

    {/* Cockpit */}
    <path
      d="M103 45 L119 46 L128 51 L117 55 L102 55 Z"
      fill="#72d8ff"
      stroke="#d9f5ff"
      strokeWidth="2"
    />

    {/* Wing details */}
    <path d="M49 47 L73 51 L49 56" fill="none" stroke="#ffaaaa" strokeWidth="2" />

    {/* Propeller */}
    <g className="propeller">
      <path d="M151 50 L159 42 L161 45 L155 51 L161 57 L159 60 Z" fill="#e5e5e5" />
    </g>
  </svg>
</div>
              {phase === "crashed" && <div className="crash-label">CRASHED!</div>}

              <div className="message">{message}</div>
            </div>

            <div className="graph-bottom">
              <span>0.0s</span>
              <span>FLIGHT GRAPH</span>
              <span>LIVE</span>
            </div>
          </section>

          <aside className="history-panel">
            <h2>◷ ROUND HISTORY</h2>

            {history.length === 0 && (
              <p className="empty-history">Your rounds will appear here</p>
            )}

            {history.map((item) => (
              <div className="history-item" key={item.id}>
                <span className={item.result === "WIN" ? "history-plane win" : "history-plane loss"}>
                  ✈
                </span>
                <strong>{item.value.toFixed(2)}x</strong>
                <b className={item.result === "WIN" ? "win-tag" : "loss-tag"}>
                  {item.result}
                </b>
                <strong className={item.amount >= 0 ? "amount-win" : "amount-loss"}>
                  {item.amount >= 0 ? "+" : ""}
                  {item.amount.toFixed(2)} MAD
                </strong>
              </div>
            ))}
          </aside>
        </div>

        <section className="controls">
          <div className="bet-control">
            <label>BET AMOUNT (MAD)</label>
            <input
              type="number"
              min="1"
              value={bet}
              disabled={phase === "flying"}
              onChange={(e) => setBet(Number(e.target.value))}
            />
          </div>

          {phase === "flying" ? (
            <button className="cashout-button" disabled={cashedOut} onClick={cashOut}>
              {cashedOut ? "CASHED OUT ✓" : "💵 CASH OUT"}
            </button>
          ) : (
            <button className="play-button" onClick={startGame}>
              ▶ PLAY
            </button>
          )}
        </section>

        <footer>
          <strong>♛ AVIATOR GOLD © 2026 ♛</strong>
          <p>DEMO CREDITS ONLY — NO REAL MONEY</p>
        </footer>
      </main>

      {walletOpen && (
        <div className="modal-overlay">
          <div className="wallet-modal">
            <button className="modal-close" onClick={() => setWalletOpen(false)}>×</button>
            <h2>DEMO WALLET</h2>
            <p>Current balance: <strong>{balance.toFixed(2)} MAD</strong></p>
            <label>AMOUNT (MAD)</label>
            <input
              type="number"
              min="1"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
            />
            <div className="wallet-actions">
              <button onClick={() => walletAction("deposit")}>＋ ADD DEMO CREDITS</button>
              <button onClick={() => walletAction("withdraw")}>－ WITHDRAW DEMO CREDITS</button>
            </div>
            <small>Virtual credits only. No real deposits or withdrawals.</small>
          </div>
        </div>
      )}
    </div>
  );
}
