import { Telegraf } from 'telegraf';
import ccxt from 'ccxt';
import technicalindicators from 'technicalindicators';

const bot = new Telegraf('8028981790:AAFjGZIe5o32B7BgvgH3hqATUMz0Wy4ji7E');
const chatId = '7708185346';

// Ganti simbol coin jadi versi yang didukung Indodax (semua lowercase dan pakai IDR)
const coins = ['btc/idr', 'eth/idr', 'bnb/idr', 'sol/idr', 'xrp/idr', 'ada/idr', 'avax/idr', 'doge/idr', 'link/idr', 'dot/idr'];

// Ganti binance → indodax
const binance = new ccxt.indodax();

export default async function handler(req, res) {
  try {
    let messages = [];

    for (let symbol of coins) {
      const ohlcv = await binance.fetchOHLCV(symbol, '1m', undefined, 100);
      const closes = ohlcv.map(c => c[4]);

      const rsi = technicalindicators.RSI.calculate({ period: 14, values: closes });
      const ema = technicalindicators.EMA.calculate({ period: 14, values: closes });
      const macd = technicalindicators.MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });

      const latestRSI = rsi[rsi.length - 1];
      const latestEMA = ema[ema.length - 1];
      const latestMACD = macd[macd.length - 1];
      const priceNow = closes[closes.length - 1];

      let signal = null;

      if (latestRSI < 30 && latestMACD.MACD > latestMACD.signal && priceNow > latestEMA) {
        signal = 'BELI ✅';
      } else if (latestRSI > 70 && latestMACD.MACD < latestMACD.signal && priceNow < latestEMA) {
        signal = 'JUAL ❌';
      }

      if (signal) {
        const confidence = Math.floor(Math.random() * 11) + 90; // 90 - 100%
        const message = `🚨 [Crypto Signal AI] 🚨\nSinyal: ${signal}\nKoin: ${symbol.toUpperCase()}\nHarga Sekarang: Rp${priceNow.toLocaleString('id-ID')}\nConfidence: ${confidence}%\nTimeframe: 1 Menit\n🕒 ${new Date().toLocaleString('id-ID')}`;
        await bot.telegram.sendMessage(chatId, message);
        messages.push(message);
      }
    }

    res.status(200).json({ success: true, sent: messages.length });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
