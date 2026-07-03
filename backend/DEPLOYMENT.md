# Rural School ERP - Deployment Guide

## Prerequisites
- Node.js 18+
- MongoDB 6+ (Atlas or self-hosted)
- Cloudinary account
- PM2 (production process manager)

---

## Local Development Setup

```bash
# 1. Clone and install
cd rural-school-erp/backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Seed database
npm run seed

# 4. Start development server
npm run dev
# Server runs on http://localhost:5000
```

---

## Production Deployment (Ubuntu VPS)

### 1. Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx
npm install -g pm2
```

### 2. Setup MongoDB Atlas
- Create a free M0 or paid cluster on cloud.mongodb.com
- Create a database user
- Whitelist your server IP
- Copy the connection string

### 3. Configure Environment
```bash
# .env for production
NODE_ENV=production
PORT=5000
MONGO_GLOBAL_URI=mongodb+srv://user:pass@cluster.mongodb.net/school_erp_global
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-key>
CLOUDINARY_API_SECRET=<your-secret>
CLIENT_URL=https://yourdomain.com
```

### 4. Start with PM2
```bash
cd /var/www/school-erp/backend
npm install --production
pm2 start server.js --name "school-erp-backend"
pm2 save
pm2 startup
```

> **Socket.io note:** the app emits real-time in-app notifications over
> Socket.io. The single-instance PM2 command above works as-is. If you later
> scale to PM2 cluster mode (`-i max`) or multiple servers behind a load
> balancer, Socket.io needs either sticky sessions on the load balancer or a
> shared adapter (e.g. `@socket.io/redis-adapter`) so a client's events reach
> whichever instance it's connected to — otherwise notifications will only
> reach users connected to the same instance that created them.

### 5. Nginx Configuration
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```
The `Upgrade`/`Connection` headers and the long `proxy_read_timeout` above are
already what's needed for Socket.io's WebSocket upgrade to pass through Nginx
— no extra config required.

### 6. SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

---

## Multi-Tenant Architecture Notes

### How it works:
1. **Global DB** (`school_erp_global`) stores:
   - All users (all roles, all schools)
   - School registry with DB connection strings
   - Audit logs

2. **Per-School DB** (e.g. `school_demo2024`) stores:
   - Students, Teachers, Classes
   - Attendance, Fees, Exams
   - Homework, Notices, Leaves, Notifications
   - School-specific data

3. **Tenant Resolution**:
   - Request comes in with `x-school-id` header
   - `tenantMiddleware` looks up school in global DB
   - Gets tenant DB URI from school record
   - Creates/reuses cached Mongoose connection
   - Attaches `req.tenantDb` with all models

### Adding a New School:
```bash
POST /super-admin/schools
# Automatically:
# 1. Generates unique school code
# 2. Creates per-school MongoDB database
# 3. Creates school admin user account
# 4. School is immediately operational
```

---

## Database Indexes (Auto-Created by Mongoose)

| Collection | Indexes |
|-----------|---------|
| users | email, schoolId+role, mobile |
| schools | schoolCode, slug, status |
| students | admissionNumber, class+section+year, text search |
| teachers | employeeId, status, text search |
| attendance | classId+date+section (unique), date, academicYear |
| feepayments | studentId+academicYear, status, classId+academicYear |
| results | examId+studentId (unique), classId+academicYear |
| auditlogs | schoolId+timestamp, userId+timestamp, TTL 1yr |

---

## Security Checklist
- [x] JWT with short expiry (7d access, 30d refresh)
- [x] Bcrypt password hashing (12 rounds)
- [x] Rate limiting (100 req/15min global, 20 req/15min auth)
- [x] Account lockout after 5 failed attempts
- [x] MongoDB injection sanitization
- [x] Helmet security headers
- [x] CORS configured
- [x] Input validation (Joi)
- [x] Role-based access control
- [x] School boundary enforcement
- [x] DB URI never exposed in API responses
- [x] Audit logging for all mutations
- [ ] Enable HTTPS in production
- [ ] Set strong JWT secrets (64+ chars)
- [ ] Restrict MongoDB network access

---

## Monitoring & Logs

```bash
# View PM2 logs
pm2 logs school-erp-backend

# View log files
tail -f backend/logs/combined-YYYY-MM-DD.log
tail -f backend/logs/error-YYYY-MM-DD.log
tail -f backend/logs/audit-YYYY-MM-DD.log
```

Log retention:
- Combined: 14 days
- Errors: 30 days
- Audit: 90 days (also in MongoDB with 1yr TTL)

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| NODE_ENV | Yes | development/production |
| PORT | Yes | Server port (5000) |
| MONGO_GLOBAL_URI | Yes | Global MongoDB connection string |
| JWT_SECRET | Yes | Access token secret (64+ chars) |
| JWT_EXPIRES_IN | No | Token expiry (default: 7d) |
| JWT_REFRESH_SECRET | Yes | Refresh token secret |
| JWT_REFRESH_EXPIRES_IN | No | Refresh expiry (default: 30d) |
| CLOUDINARY_CLOUD_NAME | Yes | Cloudinary cloud name |
| CLOUDINARY_API_KEY | Yes | Cloudinary API key |
| CLOUDINARY_API_SECRET | Yes | Cloudinary API secret |
| CLIENT_URL | Yes | Frontend URL for CORS |
| SUPER_ADMIN_EMAIL | No | Seeder: super admin email |
| SUPER_ADMIN_PASSWORD | No | Seeder: super admin password |
| BCRYPT_SALT_ROUNDS | No | Password hashing rounds (default: 12) |
