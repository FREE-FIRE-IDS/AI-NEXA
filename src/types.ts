export interface TechnicalIndicators {
  price: number;
  change24h: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  emaFast: number;
  emaSlow: number;
  emaStatus: 'Bullish' | 'Bearish' | 'Neutral';
  stochK: number;
  stochD: number;
  volume: string;
  volumeValue: number;
  high: number;
  low: number;
}

export type TradingAction = 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL' | 'HOLD';

export interface TradingSignal {
  symbol: string;
  action: TradingAction;
  confidence: number;
  entryPrice: number;
  takeProfit: number;
  takeProfit2: number;
  stopLoss: number;
  timeframe: string;
  timestamp: number;
  reasoning: string[];
  indicators: TechnicalIndicators;
  geminiError?: string | null;
}

export interface ActiveOrder {
  id: string;
  symbol: string;
  action: TradingAction;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  durationMinutes: number;
  totalSeconds: number;
  secondsRemaining: number;
  timestamp: number;
  status: 'running' | 'completed' | 'cancelled';
  exitPrice?: number;
  result?: 'PROFIT' | 'LOSS' | 'NEUTRAL';
}

export interface MarketPair {
  symbol: string;
  base: string;
  quote: string;
  label: string;
}

export interface TimeFrame {
  value: string;
  label: string;
  minutes: number;
}
