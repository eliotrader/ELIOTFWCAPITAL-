export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const TWELVE_KEY = process.env.TWELVE_DATA_KEY;
  const FRED_KEY = process.env.FRED_API_KEY;

  const result = {};

  async function safeFetch(url, timeout = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        console.error("Fetch error:", response.status, url);
        return null;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timer);
      console.error("safeFetch error:", error.message);
      return null;
    }
  }

  // ==========================
  // TWELVE DATA
  // ==========================

  if (TWELVE_KEY) {
    try {
      const symbols =
        "XAU/USD,DXY,VIX,TNX,BTC/USD,EUR/USD,GBP/USD,USD/JPY,ETH/USD";

      const url =
        `https://api.twelvedata.com/price?symbol=` +
        `${encodeURIComponent(symbols)}&apikey=${TWELVE_KEY}`;

      const d = await safeFetch(url);

      if (d) {
        if (d["XAU/USD"]?.price) {
          result.xauusd = Number(d["XAU/USD"].price);
        }

        if (d["DXY"]?.price) {
          result.dxy = Number(d["DXY"].price);
        }

        if (d["VIX"]?.price) {
          result.vix = Number(d["VIX"].price);
        }

        if (d["TNX"]?.price) {
          result.tnx = Number(d["TNX"].price);
        }

        if (d["BTC/USD"]?.price) {
          result.btc = Number(d["BTC/USD"].price);
        }

        if (d["EUR/USD"]?.price) {
          result.eurusd = Number(d["EUR/USD"].price);
        }

        if (d["GBP/USD"]?.price) {
          result.gbpusd = Number(d["GBP/USD"].price);
        }

        if (d["USD/JPY"]?.price) {
          result.usdjpy = Number(d["USD/JPY"].price);
        }

        if (d["ETH/USD"]?.price) {
          result.ethusd = Number(d["ETH/USD"].price);
        }
      }
    } catch (error) {
      console.error("Twelve batch error:", error.message);
    }

    // XAU OHLC
    try {
      const url =
        `https://api.twelvedata.com/time_series` +
        `?symbol=XAU/USD` +
        `&interval=1day` +
        `&outputsize=2` +
        `&apikey=${TWELVE_KEY}`;

      const d = await safeFetch(url);

      if (d?.values?.length) {
        const latest = d.values[0];

        result.xauusd_high = Number(latest.high);
        result.xauusd_low = Number(latest.low);
        result.xauusd_open = Number(latest.open);

        if (d.values[1]?.close) {
          result.xauusd_close_prev = Number(d.values[1].close);
        }
      }
    } catch (error) {
      console.error("XAU OHLC error:", error.message);
    }
  } else {
    result.twelve_error = "TWELVE_DATA_KEY missing";
  }

  // ==========================
  // FRED
  // ==========================

  if (FRED_KEY) {
    // FED FUNDS
    try {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=FEDFUNDS` +
        `&sort_order=desc` +
        `&limit=1` +
        `&api_key=${FRED_KEY}` +
        `&file_type=json`;

      const fed = await safeFetch(url);

      const value = fed?.observations?.[0]?.value;

      if (value && value !== ".") {
        result.fed_rate = Number(value);
      }
    } catch (error) {
      console.error("FED error:", error.message);
    }

    // CPI YOY CORRECTO
    try {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=CPIAUCSL` +
        `&sort_order=desc` +
        `&limit=13` +
        `&api_key=${FRED_KEY}` +
        `&file_type=json`;

      const cpi = await safeFetch(url);

      if (cpi?.observations?.length >= 13) {
        const current = Number(cpi.observations[0].value);
        const yearAgo = Number(cpi.observations[12].value);

        if (
          Number.isFinite(current) &&
          Number.isFinite(yearAgo) &&
          yearAgo !== 0
        ) {
          result.cpi_yoy = Number(
            (((current - yearAgo) / yearAgo) * 100).toFixed(2)
          );
        }
      }
    } catch (error) {
      console.error("CPI error:", error.message);
    }
  } else {
    result.fred_error = "FRED_API_KEY missing";
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );

  return res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...result,
  });
}
