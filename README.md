# Tamalika Backend

## MongoDB Atlas setup

This project requires MongoDB Atlas for persistent storage. The backend will only start successfully when `MONGO_URI` points to a valid Atlas connection string.

### 1. Create a MongoDB Atlas cluster

1. Sign in to MongoDB Atlas at https://cloud.mongodb.com/
2. Create a new project if needed.
3. Build a free cluster (Shared Tier / M0) or a paid cluster.

### 2. Configure Network Access

1. Go to "Network Access".
2. Add your current IP address or allow access from anywhere using `0.0.0.0/0`.

### 3. Create a database user

1. Go to "Database Access".
2. Add a new database user with a username and password.
3. Grant the user `Read and write to any database` or a scoped role for your database.

### 4. Update `.env`

Copy the Atlas connection string from the cluster's "Connect" panel and paste it into `.env` as `MONGO_URI`.

Example:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tamalika?retryWrites=true&w=majority
MONGO_DB_NAME=tamalika
```

### 5. Start the backend

```bash
npm start
```

### 6. Verify Atlas connection

The server will log:

```text
MongoDB Atlas connected
Backend running on port 4000
```

If the matrix shows an error, confirm:
- the Atlas URI is correct
- the database user credentials are valid
- network access is configured for your IP

## API routes

- `POST /api/contact`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/admins`
- `POST /api/admins`
- `PUT /api/admins/:id`
- `DELETE /api/admins/:id`
