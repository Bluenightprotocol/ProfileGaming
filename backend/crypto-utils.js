// crypto-utils.js: cifrado y descifrado reversible de la IP, con AES-256-GCM.
//
// A diferencia del hash que ya se usaba (que es de una sola vía: sirve para
// comparar "¿es la misma IP?" pero nunca se puede recuperar la IP original),
// esto es cifrado de verdad: con la clave correcta se puede volver a obtener
// la IP tal cual era. Se usa GCM (no solo AES-CBC) porque además de ocultar
// el dato, agrega un "sello" que detecta si el valor cifrado fue alterado.
//
// La clave vive en la variable de entorno IP_ENCRYPTION_KEY y nunca se sube
// a GitHub (ver .env.example para cómo generarla).

const crypto = require("crypto");

function getKey() {
  const keyHex = process.env.IP_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("IP_ENCRYPTION_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes)");
  }
  return Buffer.from(keyHex, "hex");
}

// Devuelve un único string con todo lo necesario para descifrar después:
// "iv:authTag:datosCifrados", los tres en hexadecimal separados por ":".
function encryptIP(ip) {
  const iv = crypto.randomBytes(12); // tamaño recomendado para GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(ip), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptIP(payload) {
  const [ivHex, authTagHex, dataHex] = String(payload).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = { encryptIP, decryptIP };
