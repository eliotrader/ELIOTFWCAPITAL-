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

  // =========================================================
  // FETCH SEGURO
  // =========================================================
  async function safeFetch(url, timeout = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timer);

      const data = await response.json();

      if (!response.ok) {
        return {
          error: true,
          status: response.status,
          data,
        };
      }

      return data;
    } catch (error) {
      clearTimeout(timer);

      return {
        error: true,
        message: error.message,
      };
    }
  }

  // =========================================================
// TWELVE DATA — XAU/USD
// Precio actual + Open + High + Low + Previous Close
// =========================================================
if (TWELVE_KEY) {
  try {
    const gold = await safeFetch(
      `https://api.twelvedata.com/quote` +
      `?symbol=${encodeURIComponent("XAU/USD")}` +
      `&apikey=${TWELVE_KEY}`
    );

    if (gold && !gold.error) {
      // Precio actual
      if (
        gold.close !== undefined &&
        Number.isFinite(Number(gold.close))
      ) {
        result.xauusd = Number(gold.close);
      }

      // Apertura
      if (
        gold.open !== undefined &&
        Number.isFinite(Number(gold.open))
      ) {
        result.xauusd_open = Number(gold.open);
      }

      // Máximo del período/día devuelto por Twelve Data
      if (
        gold.high !== undefined &&
        Number.isFinite(Number(gold.high))
      ) {
        result.xauusd_high = Number(gold.high);
      }

      // Mínimo del período/día devuelto por Twelve Data
      if (
        gold.low !== undefined &&
        Number.isFinite(Number(gold.low))
      ) {
        result.xauusd_low = Number(gold.low);
      }

      // Cierre previo
      if (
        gold.previous_close !== undefined &&
        Number.isFinite(Number(gold.previous_close))
      ) {
        result.xauusd_close_prev = Number(gold.previous_close);
      }

      result.xauusd_datetime = gold.datetime || null;
    } else {
      result.xau_debug = gold;
    }
  } catch (error) {
    result.xau_error = error.message;
  }
} else {
  result.twelve_error = "TWELVE_DATA_KEY missing";
}  

      
    try {
      const fed = await safeFetch(
        `https://api.stlouisfed.org/fred/series/observations` +
          `?series_id=FEDFUNDS` +
          `&sort_order=desc` +
          `&limit=1` +
          `&api_key=${FRED_KEY}` +
          `&file_type=json`
      );

      const value = fed?.observations?.[0]?.value;

      if (value && value !== ".") {
        result.fed_rate = Number(value);
      } else {
        result.fed_debug = fed;
      }
    } catch (error) {
      result.fed_error = error.message;
    }

    // ---------------------------------------------------------
    // CPI YOY
    // ---------------------------------------------------------
    try {
      const cpi = await safeFetch(
        `https://api.stlouisfed.org/fred/series/observations` +
          `?series_id=CPIAUCSL` +
          `&sort_order=desc` +
          `&limit=13` +
          `&api_key=${FRED_KEY}` +
          `&file_type=json`
      );

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
      } else {
        result.cpi_debug = cpi;
      }
    } catch (error) {
      result.cpi_error = error.message;
    }

    // ---------------------------------------------------------
    // US TREASURY 10Y — DGS10
    // ---------------------------------------------------------
    try {
      const us10y = await safeFetch(
        `https://api.stlouisfed.org/fred/series/observations` +
          `?series_id=DGS10` +
          `&sort_order=desc` +
          `&limit=10` +
          `&api_key=${FRED_KEY}` +
          `&file_type=json`
      );

      const observations = us10y?.observations || [];

      const latestValid = observations.find(
        (obs) =>
          obs?.value &&
          obs.value !== "." &&
          Number.isFinite(Number(obs.value))
      );

      if (latestValid) {
        result.us10y = Number(latestValid.value);
        result.us10y_date = latestValid.date;
      } else {
        result.us10y_debug = us10y;
      }
    } catch (error) {
      result.us10y_error = error.message;
    }

    // ---------------------------------------------------------
    // USD INDEX (FED) — DTWEXBGS
    // Nominal Broad U.S. Dollar Index
    // IMPORTANTE: no es el DXY clásico.
    // ---------------------------------------------------------
    try {
      const usdIndex = await safeFetch(
        `https://api.stlouisfed.org/fred/series/observations` +
          `?series_id=DTWEXBGS` +
          `&sort_order=desc` +
          `&limit=10` +
          `&api_key=${FRED_KEY}` +
          `&file_type=json`
      );

      const observations = usdIndex?.observations || [];

      const latestValid = observations.find(
        (obs) =>
          obs?.value &&
          obs.value !== "." &&
          Number.isFinite(Number(obs.value))
      );

      if (latestValid) {
        result.usd_index_fed = Number(latestValid.value);
        result.usd_index_fed_date = latestValid.date;
      } else {
        result.usd_index_fed_debug = usdIndex;
      }
    } catch (error) {
      result.usd_index_fed_error = error.message;
    }
  } else {
    result.fred_error = "FRED_API_KEY missing";
  }

  // =========================================================
  // RESPUESTA FINAL
  // =========================================================
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
