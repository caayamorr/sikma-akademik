/**
 * Kotak pesan error/sukses. Pesan dirender sebagai teks biasa ({pesan}),
 * jadi aman dari XSS walau isinya berasal dari server.
 */
export default function Alert({ type = "error", pesan }) {
  if (!pesan) return null;
  const gaya =
    type === "error"
      ? "bg-red-50 border-red-300 text-red-800"
      : type === "success"
      ? "bg-green-50 border-green-300 text-green-800"
      : "bg-blue-50 border-blue-300 text-blue-800";
  return (
    <div role="alert" className={`border rounded px-4 py-2 text-sm mb-4 ${gaya}`}>
      {pesan}
    </div>
  );
}
