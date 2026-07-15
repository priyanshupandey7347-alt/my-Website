const dns = require('dns');
const mongoose = require('mongoose');
let connected = false;

const _validateUri = (uri) => {
  if (!uri) return 'MONGO_URI is empty';
  if (/<[\s\S]*>/.test(uri)) return 'MONGO_URI contains placeholder tokens (e.g. <username> or <password>); replace them with real values.';
  if (!(uri.startsWith('mongodb+srv://') || uri.startsWith('mongodb://'))) return 'MONGO_URI must start with "mongodb+srv://" or "mongodb://"';
  return null;
};

const _resolveSrvViaPublicDns = async (host) => {
  const originalServers = dns.getServers();
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  try {
    return await new Promise((resolve, reject) => {
      dns.resolveSrv(host, (err, records) => {
        if (err) return reject(err);
        resolve(records);
      });
    });
  } finally {
    dns.setServers(originalServers);
  }
};

const _resolveTxtViaPublicDns = async (host) => {
  const originalServers = dns.getServers();
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  try {
    return await new Promise((resolve, reject) => {
      dns.resolveTxt(host, (err, records) => {
        if (err) return reject(err);
        resolve(records);
      });
    });
  } finally {
    dns.setServers(originalServers);
  }
};

const _buildFallbackUri = async (srvUri) => {
  const uri = new URL(srvUri);
  const host = uri.host;
  const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : process.env.MONGO_DB_NAME || 'tamalika';
  const auth = uri.username ? `${encodeURIComponent(uri.username)}:${encodeURIComponent(uri.password)}@` : '';
  const baseOptions = new URLSearchParams(uri.searchParams);

  if (!baseOptions.has('retryWrites')) baseOptions.set('retryWrites', 'true');
  if (!baseOptions.has('w')) baseOptions.set('w', 'majority');
  if (!baseOptions.has('tls') && !baseOptions.has('ssl')) baseOptions.set('tls', 'true');

  const srvRecords = await _resolveSrvViaPublicDns(`_mongodb._tcp.${host}`);
  const hosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(',');

  try {
    const txtRecords = await _resolveTxtViaPublicDns(`_mongodb._tcp.${host}`);
    const txtString = txtRecords.flat().join('');
    const txtParams = new URLSearchParams(txtString);
    txtParams.forEach((value, key) => {
      if (!baseOptions.has(key)) {
        baseOptions.set(key, value);
      }
    });
  } catch (txtErr) {
    // TXT lookup is optional; continue if not available
  }

  return `mongodb://${auth}${hosts}/${dbName}?${baseOptions.toString()}`;
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI?.trim();
  const invalid = _validateUri(uri);
  if (invalid) {
    throw new Error(`${invalid} See README.md for Atlas setup instructions.`);
  }

  try {
    mongoose.set('strictQuery', false);
    if (process.env.DEBUG_MONGO === 'true') {
      mongoose.set('debug', function(coll, method, query, doc) {
        console.debug('MONGODEBUG', coll, method, JSON.stringify(query), doc || '');
      });
    }
    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || 'tamalika',
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    connected = true;
    console.log('MongoDB Atlas connected');
  } catch (err) {
    connected = false;
    console.error('MongoDB Atlas connection failed.');
    console.error(err && err.message ? err.message : err);

    if (String(err).includes('querySrv') || String(err).includes('ENOTFOUND') || String(err).includes('EBADNAME') || String(err).includes('ECONNREFUSED') || String(err).includes('TLS') || String(err).includes('SSL')) {
      try {
        const fallbackUri = await _buildFallbackUri(uri);
        console.log('Attempting fallback connection with direct host list via public DNS:', fallbackUri.replace(/mongodb:\/\/[\s\S]*?:.*@/, 'mongodb://***:***@'));

        const attempts = [
          { family: 6, tlsAllowInvalidCertificates: false, tlsAllowInvalidHostnames: false },
          { family: 6, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: false },
          { family: 6, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true },
          { family: 4, tlsAllowInvalidCertificates: false, tlsAllowInvalidHostnames: false },
          { family: 4, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: false },
          { family: 4, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true },
        ];

        for (const opt of attempts) {
          try {
            console.log('Trying fallback connect with options:', opt);
            await mongoose.connect(fallbackUri, Object.assign({
              dbName: process.env.MONGO_DB_NAME || 'tamalika',
              autoIndex: true,
              serverSelectionTimeoutMS: 10000,
              socketTimeoutMS: 45000,
            }, opt));
            connected = true;
            console.log('MongoDB Atlas connected via fallback URI with options:', opt);
            return;
          } catch (tryErr) {
            console.error('Fallback attempt failed with options', opt, tryErr && tryErr.message ? tryErr.message : tryErr);
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback Atlas connection failed:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
      }
    }

    console.error('\nPossible causes:\n' +
      '- `MONGO_URI` still contains placeholders (replace <username>/<password>).\n' +
      "- DNS SRV lookups are blocked on this machine/network; ensure you can resolve '<cluster>.mongodb.net'.\n" +
      "- Your IP is not whitelisted in Atlas Network Access (or use 0.0.0.0/0 temporarily).\n" +
      "- Firewall or corporate DNS policies are preventing SRV lookups.\n" +
      "Actions: update .env with the full Atlas connection string (url-encode special characters in password), check Atlas Network Access, or use an alternative network.\n"
    );

    throw err;
  }
};

const isMongoConnected = () => connected;

module.exports = { connectDB, isMongoConnected };
