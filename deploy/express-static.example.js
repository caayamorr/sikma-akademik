/**
 * ALTERNATIF TANPA NGINX: Express menyajikan folder dist/ sekaligus API.
 * Ini CONTOH potongan untuk backend (Dimas), bukan bagian dari frontend.
 * Taruh dua blok static di PALING BAWAH, setelah semua rute /api.
 */
const path = require("path");
const express = require("express");
const app = express();

// ... middleware (helmet, cookie-parser, express.json) dan semua rute /api/... di atas ...

// 1) Sajikan file hasil build (npm run build -> dist/)
app.use(express.static(path.join(__dirname, "dist")));

// 2) Fallback SPA: selain /api, kembalikan index.html
//    (agar refresh di /dashboard/mhs dll tidak 404)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Backend internal: dengarkan hanya di localhost jika di belakang Nginx
app.listen(3000, "127.0.0.1");
