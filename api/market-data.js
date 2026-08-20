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
  // =========================================================
  if (TWELVE_KEY) {
    try {
      const gold = await safeFetch(
        `https://api.twelvedata.com/price` +
        `?symbol=${encodeURIComponent("XAU/USD")}` +
        `&apikey=${TWELVE_KEY}`
      );

      if (gold?.price) {
        result.xauusd = Number(gold.price);
      } else {
        result.xau_debug = gold;
      }
    } catch (error) {
      result.xau_error = error.message;
    }

    // =========================================================
    // DXY — todavía en diagnóstico
    // =========================================================
    try {
      const dxy = await safeFetch(
        `https://api.twelvedata.com/price` +
        `?symbol=${encodeURIComponent("DXY")}` +
        `&apikey=${TWELVE_KEY}`
      );

      if (dxy?.price) {
        result.dxy = Number(dxy.price);
      } else {
        result.dxy_debug = dxy;
      }
    } catch (error) {
      result.dxy_error = error.message;
    }
  } else {
    result.twelve_error = "TWELVE_DATA_KEY missing";
  }

  // =========================================================
  // FRED
  // =========================================================
  if (FRED_KEY) {
    // ---------------------------------------------------------
    // FED FUNDS RATE
    // ---------------------------------------------------------
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
