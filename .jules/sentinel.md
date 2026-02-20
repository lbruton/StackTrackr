## 2025-02-18 - PBKDF2 Iterations Upgrade
**Vulnerability:** Weak PBKDF2 iterations (100,000) for password-based encryption.
**Learning:** OWASP recommendations for PBKDF2-HMAC-SHA256 have increased to 600,000 iterations to counter modern GPU-based brute-force capabilities. The original 100,000 count was outdated.
**Prevention:** Regularly review cryptographic parameters against current industry standards (OWASP, NIST). Use versioned file headers (like the `.stvault` format here) to allow seamless upgrades of security parameters without breaking backward compatibility.
