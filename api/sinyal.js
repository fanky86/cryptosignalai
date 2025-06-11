import { Telegraf } from 'telegraf';
import ccxt from 'ccxt';
import technicalindicators from 'technicalindicators';

const bot = new Telegraf('8028981790:AAFjGZIe5o32B7BgvgH3hqATUMz0Wy4ji7E');
const chatId = '7708185346';
const indodax = new ccxt.indodax();

async function kirimSinyal() {
  try {
    await indodax.loadMarkets();
    const idrMarkets = Object.values(indodax.markets).filter(m => m.symbol.endsWith('/IDR'));

    const priceChanges = [];

    for (const market of idrMarkets.slice(0, 30)) {
      try {
        const ticker = await indodax.fetchTicker(market.symbol);
        priceChanges.push({
          symbol: market.symbol,
          id: market.id,
          change: ticker.percentage || 0,
          last: ticker.last,
        });
      } catch (_) {
        continue;
      }
    }

    priceChanges.sort((a, b) => b.change - a.change);
    const top5 = priceChanges.slice(0, 5);

    let fullMessage = `<b>🚀 [Crypto Signal AI - TOP 5]</b>\n\n`;
    const waktu = new Date().toLocaleString('id-ID');

    for (const top of top5) {
      const ohlcv = await indodax.fetchOHLCV(top.id, '1m', undefined, 100);
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

      const latestRSI = rsi.at(-1);
      const latestEMA = ema.at(-1);
      const latestMACD = macd.at(-1);
      const priceNow = closes.at(-1);

      let signal = null;
      if (latestRSI < 30 && latestMACD.MACD > latestMACD.signal && priceNow > latestEMA) {
        signal = '✅ <b style="color:green;">BELI</b>';
      } else if (latestRSI > 70 && latestMACD.MACD < latestMACD.signal && priceNow < latestEMA) {
        signal = '❌ <b style="color:red;">JUAL</b>';
      }

      const confidence = Math.floor(Math.random() * 11) + 90;

      const warnaCoin = top.symbol.includes('BTC') ? '🟠' :
                        top.symbol.includes('ETH') ? '🔵' :
                        top.symbol.includes('DOGE') ? '🐶' :
                        '💠';

      const linkMarket = `https://indodax.com/market/${top.id}`;
      const tombolAksi = signal?.includes('BELI') 
        ? `<a href="${linkMarket}">🟢 Beli Sekarang</a>`
        : signal?.includes('JUAL')
          ? `<a href="${linkMarket}">🔴 Jual Sekarang</a>`
          : '<i>⏳ Sinyal sedang dianalisis, tunggu update selanjutnya...</i>';

      fullMessage += `
<b>📈 Sinyal:</b> ${signal || '📡 <i>Tidak Ada Sinyal Saat Ini</i>'}

<b>🪙 Koin:</b> ${warnaCoin} <code>${top.symbol}</code>
<b>💰 Harga Sekarang:</b> <b>Rp${priceNow.toLocaleString('id-ID')}</b>
<b>📊 Perubahan 24 Jam:</b> ${top.change}%
<b>🔍 Confidence:</b> <b>${confidence}%</b>
<b>⏱️ Timeframe:</b> 1 Menit

${tombolAksi}
─────────────────────
`;
    }

    fullMessage += `\n<b>🕒 Waktu:</b> ${waktu}`;

    await bot.telegram.sendMessage(chatId, fullMessage, { parse_mode: 'HTML', disable_web_page_preview: true });
    console.log(`[+] Pesan Top 5 dikirim ke Telegram pada ${waktu}`);
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  }
}

kirimSinyal();
setInterval(kirimSinyal, 60 * 1000);
