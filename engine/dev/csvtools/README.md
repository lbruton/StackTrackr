# Lonnie's Vulnerability Toolset

A clean, focused web application for tracking and analyzing vulnerability VPR (Vulnerability Priority Rating) scores by severity level.

Copyright © 2025 Lonnie Bruton  
Licensed under GNU General Public License v3.0

## Features

- **CSV Upload**: Upload single or multiple CSV files containing vulnerability data
- **VPR Calculation**: Automatically calculates total VPR scores by severity (Critical, High, Medium, Low)
- **Visual Charts**: Interactive doughnut chart for current distribution and line chart for historical trends
- **History Tracking**: Maintains history of all uploads with trend indicators
- **Data Export/Import**: Export/import history data as JSON for backup and sharing
- **Responsive Design**: Works on desktop and mobile devices
- **No Backend Required**: Runs entirely in the browser using localStorage

## Quick Start

### Local Development
1. Open `index.html` in any modern web browser
2. Upload your CSV files containing vulnerability data
3. View calculated VPR totals and charts

### Docker Deployment (Team Use)

1. **Build and run with Docker:**
   ```bash
   docker build -t vpr-tracker .
   docker run -p 8080:80 vpr-tracker
   ```

2. **Or use Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Main app: http://localhost:8080
   - Data server (optional): http://localhost:8081

## CSV File Requirements

Your CSV files should contain:
- **VPR Column**: Named `vpr`, `vpr_score`, or `score`
- **Severity Column**: Named `severity`, `risk`, `priority`, or `level`

The severity column should contain values like:
- `Critical` or `critical`
- `High` or `high` 
- `Medium` or `medium`
- `Low` or `low`

## Docker Configuration

### Environment Variables
- `NGINX_HOST`: Host name (default: localhost)
- `NGINX_PORT`: Port number (default: 80)

### Volumes
- `./data:/usr/share/nginx/html/data`: Persistent data storage
- Custom nginx config (optional)

### Networks
- Uses bridge network for container communication
- Traefik labels included for reverse proxy setup

## Data Storage & Security

### Current Storage Methods
- **Local Mode**: Uses browser localStorage
- **Docker Mode**: Data persists in mounted volume
- **Export/Import**: JSON format for portability

### Secure Storage Options

1. **Enhanced Local Storage with Encryption**
   ```javascript
   // Add crypto-js to your project
   <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>

   // Implement encrypted storage
   const secureStorage = {
     storeData(data, password) {
       const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), password);
       localStorage.setItem('vprHistory', encrypted);
     },
     
     retrieveData(password) {
       const encrypted = localStorage.getItem('vprHistory');
       if (!encrypted) return null;
       const decrypted = CryptoJS.AES.decrypt(encrypted, password);
       return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
     }
   };
   ```

2. **Git Repository with git-crypt**
   - Install git-crypt: `brew install git-crypt` (macOS)
   - Initialize: `git-crypt init`
   - Create `.gitattributes`:
     ```
     data/*.json filter=git-crypt diff=git-crypt
     *.key filter=git-crypt diff=git-crypt
     ```
   - Export key for team members: `git-crypt export-key ./team-key`
   - Share key securely with team

3. **Cloud Storage Options**
   - **AWS S3 + KMS**
     - Create encrypted S3 bucket
     - Use AWS KMS for key management
     - Enable versioning for audit trail
   
   - **Azure Storage**
     - Enable encryption at rest
     - Use Azure Key Vault
     - Implement RBAC

4. **Self-Hosted Backend**
   - Set up private server with HTTPS
   - Implement authentication
   - Use database encryption
   - Regular backups
   - Access logging

### Security Best Practices

1. **Data Protection**
   - Use strong encryption (AES-256)
   - Implement key rotation
   - Regular security audits
   - Secure key storage

2. **Access Control**
   - Role-based permissions
   - Multi-factor authentication
   - Session management
   - IP whitelisting

3. **Compliance**
   - Document security measures
   - Regular compliance reviews
   - Data retention policies
   - Incident response plan

### Implementation Examples

#### Encrypted Export
```javascript
async function secureExport(data, password) {
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive key using PBKDF2
  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    password,
    256
  );
  
  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: crypto.getRandomValues(new Uint8Array(12))
    },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );
  
  return {
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };
}
```

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

GNU General Public License v3.0 - see LICENSE file for details

Copyright © 2025 Lonnie Bruton. This is free and open source software.
