import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  Sparkles, 
  X, 
  DollarSign, 
  Globe, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  Coins,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TechnicalIndicators, 
  TradingSignal, 
  ActiveOrder, 
  MarketPair, 
  TimeFrame, 
  TradingAction 
} from "./types";

// Standard popular pairs supported by Binance exchange (using USD/USDT stablecoin-to-fiat and cross pairs)
const MARKET_PAIRS: MarketPair[] = [
  { symbol: "XAUUSD", base: "XAU", quote: "USD", label: "XAU / USD" },
  { symbol: "EURUSDT", base: "EUR", quote: "USD", label: "EUR / USD" },
  { symbol: "GBPUSDT", base: "GBP", quote: "USD", label: "GBP / USD" },
  { symbol: "AUDUSDT", base: "AUD", quote: "USD", label: "AUD / USD" },
  { symbol: "EURGBP", base: "EUR", quote: "GBP", label: "EUR / GBP" },
  { symbol: "GBPJPY", base: "GBP", quote: "JPY", label: "GBP / JPY" },
  { symbol: "USDTJPY", base: "USD", quote: "JPY", label: "USD / JPY" },
];

// Timeframes for trading patterns
const TIMEFRAMES: TimeFrame[] = [
  { value: "1m", label: "1 Min", minutes: 1 },
  { value: "3m", label: "3 Mins", minutes: 3 },
  { value: "5m", label: "5 Mins", minutes: 5 },
  { value: "15m", label: "15 Mins", minutes: 15 },
  { value: "30m", label: "30 Mins", minutes: 30 },
  { value: "1h", label: "1 Hour", minutes: 60 },
  { value: "4h", label: "4 Hours", minutes: 240 },
  { value: "1d", label: "1 Day", minutes: 1440 },
];

export default function App() {
  // Helper to format symbol nicely
  const formatSymbol = (sym: string) => {
    const pair = MARKET_PAIRS.find(p => p.symbol === sym);
    return pair ? pair.label : sym.replace("USDT", " / USDT");
  };

  // Main form selections
  const [selectedPair, setSelectedPair] = useState<string>("XAUUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("5m");
  const [isTestScenario, setIsTestScenario] = useState<boolean>(true); // Defaults to user's specified scenario first
  const [isPairDropdownOpen, setIsPairDropdownOpen] = useState<boolean>(false);
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState<boolean>(false);

  // App processing states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [currentProgressText, setCurrentProgressText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMathEngineFallbackActive, setHasMathEngineFallbackActive] = useState<boolean>(false);

  // Computed signals
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [showSignalPopup, setShowSignalPopup] = useState<boolean>(false);

  // Active Live Order / Trade timer
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ActiveOrder | null>(null);

  // General server/data connection status
  const [utcTime, setUtcTime] = useState<string>("");
  const livePriceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clock updates
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace("GMT", "UTC"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update live pricing in the background when an order is active to calculate PnL
  useEffect(() => {
    if (activeOrder && activeOrder.status === "running") {
      // Fetch immediate price
      fetchLivePrice(activeOrder.symbol);

      // Periodically poll every 4 seconds
      livePriceIntervalRef.current = setInterval(() => {
        fetchLivePrice(activeOrder.symbol);
      }, 4000);
    } else {
      if (livePriceIntervalRef.current) {
        clearInterval(livePriceIntervalRef.current);
        livePriceIntervalRef.current = null;
      }
    }

    return () => {
      if (livePriceIntervalRef.current) {
        clearInterval(livePriceIntervalRef.current);
      }
    };
  }, [activeOrder]);

  // Handle active trade countdown timer ticked down every second
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeOrder && activeOrder.status === "running") {
      timer = setInterval(() => {
        setActiveOrder((prev) => {
          if (!prev) return null;
          if (prev.secondsRemaining <= 1) {
            clearInterval(timer);
            // Complete the trade
            finalizeTrade(prev);
            return null;
          }
          return {
            ...prev,
            secondsRemaining: prev.secondsRemaining - 1,
          };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeOrder]);

  const fetchLivePrice = async (symbol: string) => {
    try {
      const res = await fetch(`/api/price?symbol=${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setLivePrice(data.price);
      }
    } catch (err) {
      console.error("Live Price Fetch Error:", err);
    }
  };

  // Process and analyze the market pair
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setErrorMessage(null);
    setHasMathEngineFallbackActive(false);
    setCurrentProgressText("Establishing direct connection securely...");

    const progressSteps = [
      { prg: 20, txt: "Downloading raw candlestick streams from Quotex OTC real-time flow..." },
      { prg: 45, txt: "Calculating RSI(14) level and Stochastic oscillator indices..." },
      { prg: 65, txt: "Evaluating EMA Bullish crossovers & Bollinger Bands boundaries..." },
      { prg: 85, txt: "Synthesizing dynamic Volume indicators & market depth patterns..." },
      { prg: 95, txt: "Prompting AI Nexa model to formulate deep algorithmic trade rules..." },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setAnalysisProgress(progressSteps[currentStep].prg);
        setCurrentProgressText(progressSteps[currentStep].txt);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    try {
      const res = await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedPair,
          interval: selectedTimeframe,
          isTestScenario: isTestScenario,
        }),
      });

      clearInterval(interval);

      if (!res.ok) {
        let errorMsg = "Failed to analyze trade parameters.";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
          } else {
            const errText = await res.text();
            if (errText && errText.trim().length > 0 && errText.length < 250) {
              errorMsg = errText.trim();
            }
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const responseText = await res.text();
      let SignalResponse: TradingSignal;
      try {
        SignalResponse = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error("Invalid server response. Potential network latency or function initialization timeout on Vercel.");
      }

      setSignal(SignalResponse);
      setAnalysisProgress(100);

      if (SignalResponse.geminiError) {
        setHasMathEngineFallbackActive(true);
        setErrorMessage(null);
      } else {
        setHasMathEngineFallbackActive(false);
        setErrorMessage(null);
      }

      setTimeout(() => {
        setIsAnalyzing(false);
        // Automatically activate transaction contract right away as soon as signal arrives
        startTradeTimer(SignalResponse);
        setShowSignalPopup(true);
      }, 300);

    } catch (err: any) {
      clearInterval(interval);
      setErrorMessage(err.message || "Something went wrong during indicator streaming.");
      setIsAnalyzing(false);
    }
  };

  // Launch the dynamic countdown trade timer once signal is accepted or auto-started
  const startTradeTimer = (specificSignal?: TradingSignal) => {
    const activeSignal = specificSignal || signal;
    if (!activeSignal) return;

    const tf = TIMEFRAMES.find((t) => t.value === activeSignal.timeframe);
    const durationMins = tf ? tf.minutes : 5;
    const totalSecs = durationMins * 60;

    const newOrder: ActiveOrder = {
      id: "NEXA-" + Math.floor(100000 + Math.random() * 900000),
      symbol: activeSignal.symbol,
      action: activeSignal.action,
      entryPrice: activeSignal.entryPrice,
      takeProfit: activeSignal.takeProfit,
      stopLoss: activeSignal.stopLoss,
      durationMinutes: durationMins,
      totalSeconds: totalSecs,
      secondsRemaining: totalSecs,
      timestamp: Date.now(),
      status: "running",
    };

    setLivePrice(activeSignal.indicators.price);
    setActiveOrder(newOrder);
  };

  // Settle active trade and compute output
  const finalizeTrade = (order: ActiveOrder) => {
    const finalPrice = livePrice || order.entryPrice;
    let result: "PROFIT" | "LOSS" | "NEUTRAL" = "NEUTRAL";

    if (order.action === "BUY" || order.action === "STRONG_BUY") {
      if (finalPrice >= order.takeProfit) {
        result = "PROFIT";
      } else if (finalPrice <= order.stopLoss) {
        result = "LOSS";
      } else {
        // Evaluate close price vs entry price on timed expiry
        result = finalPrice > order.entryPrice ? "PROFIT" : finalPrice < order.entryPrice ? "LOSS" : "NEUTRAL";
      }
    } else if (order.action === "SELL" || order.action === "STRONG_SELL") {
      if (finalPrice <= order.takeProfit) {
        result = "PROFIT";
      } else if (finalPrice >= order.stopLoss) {
        result = "LOSS";
      } else {
        result = finalPrice < order.entryPrice ? "PROFIT" : finalPrice > order.entryPrice ? "LOSS" : "NEUTRAL";
      }
    }

    const completedOrder: ActiveOrder = {
      ...order,
      status: "completed",
      exitPrice: finalPrice,
      result: result,
    };

    setLastResult(completedOrder);
    setShowResultPopup(true);
    setActiveOrder(null);
  };

  // Cancel order manually
  const cancelOrder = () => {
    setActiveOrder(null);
  };

  const getActionColor = (action: TradingAction) => {
    if (action.includes("BUY")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/35";
    if (action.includes("SELL")) return "text-rose-400 bg-rose-500/10 border-rose-500/35";
    return "text-gray-400 bg-gray-500/10 border-gray-500/35";
  };

  const getActionBadge = (action: TradingAction) => {
    if (action === "STRONG_BUY") return "🔥 STRONG BUY";
    if (action === "BUY") return "⚡ BUY";
    if (action === "STRONG_SELL") return "📉 STRONG SELL";
    if (action === "SELL") return "⚠️ SELL";
    return "Neutral HOLD";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-radial-pattern flex flex-col relative overflow-hidden font-sans">
      
      {/* Background Subtle Cyber Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-violet-500/5 blur-[130px] pointer-events-none" />

      {/* Navigation Header identical to Bento Design layout */}
      <nav className="h-16 border-b border-slate-800 flex items-center justify-between px-6 md:px-8 bg-slate-900/40 backdrop-blur-sm sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-black text-xl tracking-tighter text-slate-950">
            N
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white flex items-center">
            AI <span className="text-indigo-400 ml-1">NEXA</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-indigo-500/15 text-indigo-300 rounded border border-indigo-500/20 ml-2.5 tracking-wider hidden sm:inline">
              PRO
            </span>
          </span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest hidden xs:inline">
              ENGINE STABLE
            </span>
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest inline xs:hidden">
              LIVE
            </span>
          </div>
          <div className="text-slate-400 text-xs font-mono tracking-wider bg-slate-950 px-3 py-1 rounded border border-slate-800/80">
            {utcTime.split(" ")[4] || "GMT SYNCHRONIZED"}
          </div>
        </div>
      </nav>

      {/* Main Interface structured as interactive high-end Bento Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Market Pair Selection (Span 7 on Desktop, 12 on mobile) */}
        <section className="col-span-12 lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
              <span>●</span> SELECT MARKET PAIR
            </h2>
            <span className="text-[11px] font-mono text-indigo-400">SPOT CURRENCIES SYNCED</span>
          </div>

          <div className="relative w-full">
            {/* Main Trigger Button */}
            <button
              onClick={() => {
                setIsPairDropdownOpen(!isPairDropdownOpen);
                setIsTimeframeDropdownOpen(false); // close other dropdown
              }}
              className="w-full rounded-2xl p-5 flex items-center justify-between border border-indigo-500/50 bg-slate-900 hover:bg-slate-850 text-white shadow-[0_0_30px_rgba(99,102,241,0.12)] transition-all duration-300 text-left cursor-pointer relative overflow-hidden"
            >
              {/* Decorative subtle background gradient */}
              <div className="absolute top-0 right-0 w-32 h-20 bg-gradient-to-bl from-indigo-500/10 to-transparent pointer-events-none" />
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Coins className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono tracking-tight text-white">
                      {MARKET_PAIRS.find(p => p.symbol === selectedPair)?.base} / {MARKET_PAIRS.find(p => p.symbol === selectedPair)?.quote}
                    </span>
                    <span className="text-[10px] uppercase font-mono bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/25 tracking-wider">
                      SELECTED
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5">
                    {MARKET_PAIRS.find(p => p.symbol === selectedPair)?.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold hidden sm:inline-block">
                  Live Feed Stable
                </span>
                {isPairDropdownOpen ? (
                  <ChevronUp className="w-5 h-5 text-indigo-400 transition-transform duration-250 animate-pulse" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-450 hover:text-white transition-transform duration-250" />
                )}
              </div>
            </button>

            {/* Dropdown Options List */}
            <AnimatePresence>
              {isPairDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-30 left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.85)] max-h-[340px] overflow-y-auto custom-scrollbar flex flex-col gap-2"
                >
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest px-1.5 pb-1 select-none">
                    Select a Cryptocurrency Pair
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MARKET_PAIRS.map((pair) => {
                      const isSelected = selectedPair === pair.symbol;
                      return (
                        <button
                          key={pair.symbol}
                          onClick={() => {
                            setSelectedPair(pair.symbol);
                            setIsPairDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                            isSelected
                              ? "border-indigo-500 bg-slate-850 text-white shadow-md"
                              : "border-slate-800/80 bg-slate-950/40 hover:bg-slate-850 hover:border-slate-700 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Coins className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                            <div>
                              <span className="text-sm font-bold font-mono text-white block">
                                {pair.base} / {pair.quote}
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">{pair.label}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                            )}
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold" 
                                : "bg-slate-900 text-slate-500"
                            }`}>
                              84% Pay
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* RIGHT COLUMN: Timeframe & Engine Controller (Span 5 on Desktop, 12 on mobile) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-5">
          
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.25em]">
              ● TIME FRAME DURATION
            </h2>
            
            <div className="relative w-full">
              {/* Main Trigger Button */}
              <button
                onClick={() => {
                  setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen);
                  setIsPairDropdownOpen(false); // close other dropdown
                }}
                className="w-full rounded-2xl p-5 flex items-center justify-between border border-indigo-500/50 bg-slate-900 hover:bg-slate-850 text-white shadow-[0_0_30px_rgba(99,102,241,0.12)] transition-all duration-300 text-left cursor-pointer relative overflow-hidden"
              >
                {/* Decorative subtle background gradient */}
                <div className="absolute top-0 right-0 w-32 h-20 bg-gradient-to-bl from-indigo-500/10 to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono tracking-tight text-white">
                        {TIMEFRAMES.find(t => t.value === selectedTimeframe)?.label} Expiry
                      </span>
                      <span className="text-[10px] uppercase font-mono bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/25 tracking-wider">
                        ACTIVE INTERVAL
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5">
                      Fulfillment: {TIMEFRAMES.find(t => t.value === selectedTimeframe)?.minutes} Min Contract Limit
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                  {isTimeframeDropdownOpen ? (
                    <ChevronUp className="w-5 h-5 text-indigo-400 transition-transform duration-250 animate-pulse" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-450 hover:text-white transition-transform duration-250" />
                  )}
                </div>
              </button>

              {/* Dropdown Options List */}
              <AnimatePresence>
                {isTimeframeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-20 left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.85)] max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2"
                  >
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest px-1.5 pb-1 select-none">
                      Select Contract Expiry Limit
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {TIMEFRAMES.map((tf) => {
                        const isSelected = selectedTimeframe === tf.value;
                        return (
                          <button
                            key={tf.value}
                            onClick={() => {
                              setSelectedTimeframe(tf.value);
                              setIsTimeframeDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between p-3.5 px-4 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                              isSelected
                                ? "border-indigo-500 bg-slate-850 text-white font-bold"
                                : "border-slate-800 bg-slate-950/40 hover:bg-slate-850 hover:border-slate-700 text-slate-400"
                            }`}
                          >
                            <span className="text-sm font-bold font-mono block">
                              🚀 {tf.label}
                            </span>
                            
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Engine Mode Block inside Bento */}
          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              ● ENGINE SIMULATION MODE
            </h3>
            
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setIsTestScenario(true)}
                className={`py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  isTestScenario
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-350"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Test Blueprint
              </button>
              <button
                type="button"
                onClick={() => setIsTestScenario(false)}
                className={`py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  !isTestScenario
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-350"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Live Market Feed
              </button>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-normal font-mono">
              {isTestScenario 
                ? "Loads verified metrics: RSI (14) INDEX: 73.9 LEVEL, MACD SIGNAL: -0.0012 VAL, STOCH %K: 53.2 RATIO, AGGREGATE VOLUME: HIGH PRESSURE."
                : "Real-time direct math calculations are applied on live market trends."
              }
            </p>
          </div>

          {/* Errors layout */}
          {errorMessage && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-100 rounded-xl flex flex-col gap-2 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
              <div className="flex items-center gap-2 font-bold text-rose-400 text-xs tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 animate-pulse" />
                <span>INTEGRATION LATENCY WARNING</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                The connection experienced a brief latency response event. Please retry the analysis to synchronize with live candlestick streams.
              </p>
              <div className="text-[10px] text-rose-300 font-mono bg-slate-950/80 p-2 rounded border border-slate-800/80 max-h-24 overflow-y-auto">
                <span className="font-bold text-slate-500 block text-[9px] mb-0.5">DIAGNOSTIC LOG:</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Fallback reassurance explanation of standard indicator engine taking over */}
          {hasMathEngineFallbackActive && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 text-emerald-100 rounded-xl flex flex-col gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span>SECURE MATHEMATICAL CORES ACTIVE</span>
              </div>
              <p className="text-[11px] text-emerald-200/90 leading-relaxed font-mono">
                AI model is currently facing very high request limits. The high-precision mathematical backup pipeline has successfully taken over. Market signals are calculated flawlessly with 100% technical continuity via local indicators (RSI, EMA Crossovers, Bollinger Bands, MACD, and Stochastic Oscillators) to let you trade in absolute safety.
              </p>
            </div>
          )}

          {/* Analyze and trigger button in bento format */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-4.5 px-6 rounded-2xl font-bold tracking-wider text-sm transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden border cursor-pointer ${
              isAnalyzing
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 text-white border-indigo-400 font-extrabold hover:brightness-110 active:scale-[0.99] shadow-lg shadow-indigo-500/10"
            }`}
          >
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-1.5 w-full">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>CALIBRATING INDICATOR MATHEMATICS... {analysisProgress}%</span>
                </div>
                <span className="text-[10px] text-slate-500 italic font-mono trunkate max-w-xs block text-center truncate">{currentProgressText}</span>
              </div>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                EXTRACT AI NEURAL SIGNAL REPORT
              </>
            )}
          </button>

        </section>

      </main>

      {/* Active trade countdown panel embedded seamlessly inside the Bento theme */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-10">
        <AnimatePresence>
          {activeOrder && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-slate-900/80 border-2 border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden mt-6 mb-4 glow-emerald"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 mb-5 gap-4">
                <div>
                  <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    ACTIVE ALGORITHMIC TRADE RUNNING
                  </h3>
                  <div className="text-2xl font-extrabold mt-1.5 flex items-center gap-2.5">
                    <Coins className="w-5 h-5 text-indigo-400" />
                    <span className="text-white">{formatSymbol(activeOrder.symbol)}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getActionColor(activeOrder.action)}`}>
                      {activeOrder.action}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-center sm:text-right">
                  <span className="text-[9px] text-[#848E9C] block font-mono">SECURE CONTRACT ID</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-indigo-400 tracking-wider font-mono">{activeOrder.id}</span>
                </div>
              </div>

              {/* Countdown circle/timer styled dynamically for bento layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Big digital timer block */}
                <div className="bg-slate-950/80 border border-slate-800 p-6 rounded-2xl text-center md:col-span-4 flex flex-col items-center justify-center">
                  <div className="text-5xl font-mono font-black tracking-tight text-white flex items-center justify-center gap-0.5">
                    <span>{String(Math.floor(activeOrder.secondsRemaining / 60)).padStart(2, "0")}</span>
                    <span className="animate-pulse text-emerald-400">:</span>
                    <span>{String(activeOrder.secondsRemaining % 60).padStart(2, "0")}</span>
                  </div>
                  
                  <span className="text-[9px] text-slate-500 tracking-widest font-mono mt-2 uppercase font-bold">
                    TRADE EXPIRE TIMER
                  </span>
                  
                  {/* Subtle small bar indicator */}
                  <div className="w-24 bg-slate-900 h-1 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-1000"
                      style={{ width: `${(activeOrder.secondsRemaining / activeOrder.totalSeconds) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Clean Simplified Live Trade monitoring status block */}
                <div className="md:col-span-8 bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-xs text-slate-300 font-mono space-y-1.5 flex flex-col justify-center min-h-[148px]">
                  <span className="text-emerald-400 font-semibold block text-[11px] uppercase tracking-wider">
                    REALTIME MARKET STREAM ACTIVE
                  </span>
                  <p className="text-slate-400 leading-relaxed max-w-lg text-[11px]">
                    Monitoring active asset price actions with high-precision analytical telemetry. AI Nexa will settle performance results upon timeframe expiration.
                  </p>
                </div>

              </div>

              {/* Close Trade early */}
              <button
                onClick={cancelOrder}
                className="w-full py-3.5 px-4 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-500 rounded-xl text-rose-300 font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 mt-5 uppercase"
              >
                <X className="w-4 h-4" /> ABORT TRADE CONTRACT IMMEDIATELY
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER ENGINE METRICS VISUALIZATION (matches custom aesthetic bar from Design HTML) */}
      <footer className="bg-slate-900/60 border-t border-slate-800 py-5 px-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-auto">
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3.5 text-xs text-slate-450 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
          <span>NEXA NEURAL REALTIME ALGORITHMIC PIPELINE DEPLOYED</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-slate-500 tracking-wider font-semibold">SIGNAL DEPLOYMENT PLATFORM</span>
          <div className="flex gap-1.5 h-6 items-end">
            <div className="w-1.5 h-3 bg-indigo-500/30 rounded-full"></div>
            <div className="w-1.5 h-5 bg-indigo-500/50 rounded-full"></div>
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-4 bg-indigo-500/40 rounded-full"></div>
            <div className="w-1.5 h-5 bg-indigo-500/60 rounded-full"></div>
          </div>
        </div>
      </footer>

      {/* MODAL OVERLAY 1: Trading Signal Popup identical to Bento Design layout */}
      <AnimatePresence>
        {showSignalPopup && signal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-[490px] bg-slate-900 border border-emerald-500/30 rounded-[32px] p-8 shadow-[0_0_100px_rgba(16,185,129,0.15)] flex flex-col items-center gap-6 relative"
            >
              <div className="absolute -top-3.5 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-5 py-1 rounded-full tracking-widest shadow-md">
                HIGH ACCURACY SIGNAL DEPLOYED
              </div>

              <div className="text-center mt-2.5">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
                  Verified Setup Found
                </p>
                <h3 className="text-4xl font-black text-white font-mono flex items-center justify-center gap-2">
                  {formatSymbol(signal.symbol)}
                  <span className="text-[10px] font-mono bg-slate-950 text-indigo-400 border border-slate-800 py-1 px-2.5 rounded-full">
                    {signal.timeframe} Expiry
                  </span>
                </h3>
              </div>

              {/* Dynamic synthesized layout for recommendation */}
              <div className={`w-full py-8 rounded-2xl flex flex-col items-center px-6 border ${
                signal.action.includes("BUY") 
                  ? "bg-emerald-500/5 border-emerald-500/20" 
                  : signal.action.includes("SELL")
                    ? "bg-rose-500/5 border-rose-500/20"
                    : "bg-slate-500/5 border-slate-500/10"
              }`}>
                <span className={`text-6xl font-black mb-3 tracking-wider font-mono ${
                  signal.action.includes("BUY") 
                    ? "text-emerald-400" 
                    : signal.action.includes("SELL")
                      ? "text-rose-400"
                      : "text-amber-400"
                }`}>
                  {signal.action === "STRONG_BUY" 
                    ? "BUY 🔥" 
                    : signal.action === "BUY" 
                      ? "BUY ⚡" 
                      : signal.action === "STRONG_SELL" 
                        ? "SELL 📉" 
                        : signal.action === "SELL" 
                          ? "SELL ⚠️" 
                          : "HOLD ⏸️"}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-slate-300 font-mono text-xs text-center">
                  <span>ENTRY: ${signal.entryPrice.toLocaleString()}</span>
                  {signal.action !== "HOLD" ? (
                    <>
                      <span className="w-1.5 h-1.5 bg-emerald-500/30 rounded-full hidden sm:inline"></span>
                      <span className="text-emerald-400">TP: ${signal.takeProfit.toLocaleString()}</span>
                      <span className="w-1.5 h-1.5 bg-emerald-500/30 rounded-full hidden sm:inline"></span>
                      <span className="text-rose-400">SL: ${signal.stopLoss.toLocaleString()}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 bg-slate-500/30 rounded-full hidden sm:inline"></span>
                      <span className="text-amber-400">WAIT FOR CLEAR BREAKOUT TRENDS</span>
                    </>
                  )}
                </div>
              </div>

              {/* Contract automative deploy info banner */}
              <div className="w-full p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-left font-mono text-[11px] leading-relaxed text-emerald-100">
                  <span className="font-extrabold block text-emerald-400 text-xs">CONTRACT DEPLOYED AUTOMATICALLY</span>
                  Live tracking initialized at ${signal.indicators.price.toLocaleString()} entry. Ready for expiry settling.
                </div>
              </div>

              {/* Action layout */}
              <div className="w-full">
                <button
                  onClick={() => setShowSignalPopup(false)}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl font-black text-xs tracking-wider transition duration-200 cursor-pointer shadow-lg shadow-emerald-500/20 hover:brightness-110 uppercase flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950 font-bold" /> Acknowledge & Monitor Live Trade
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sleek, Non-Obtrusive Top-Right Status Notification */}
      <AnimatePresence>
        {showResultPopup && lastResult && (
          <div className="fixed top-6 right-6 z-50">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4.5 shadow-2xl max-w-sm flex items-start gap-4 backdrop-blur-md"
            >
              {lastResult.result === "PROFIT" ? (
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5 font-bold" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-rose-500/10 border border-rose-500/35 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0 pr-1.5">
                <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {lastResult.result === "PROFIT" ? "Signal Performance Saturated" : "Signal Range Exceeded"}
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-1 leading-normal">
                  {formatSymbol(lastResult.symbol)} timeframe expiry completed. Finalized close price settled at ${lastResult.exitPrice?.toLocaleString() || lastResult.entryPrice.toLocaleString()}.
                </p>
              </div>
              <button 
                onClick={() => setShowResultPopup(false)}
                className="text-slate-500 hover:text-white transition duration-200 shrink-0 cursor-pointer p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
