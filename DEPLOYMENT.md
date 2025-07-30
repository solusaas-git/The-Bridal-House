# Deployment Guide - The Bridal House Next.js App

## 🚨 IMPORTANT: Server Requirements

This Next.js application requires **server-side hosting** because it includes:
- API routes (`/api/*`)
- MongoDB database operations
- Authentication system
- File upload functionality
- Server-side rendering (SSR)

**❌ Will NOT work with static hosting (regular HTML hosting)**
**✅ Requires Node.js hosting environment**

## 🎯 Recommended Hosting Options

### Option 1: Vercel (Recommended - Free)
1. Push code to GitHub
2. Connect GitHub to Vercel
3. Deploy automatically
4. Add environment variables

### Option 2: Plesk with Node.js Support
1. Enable Node.js in Plesk panel
2. Upload project files
3. Install dependencies: `npm install`
4. Set startup command: `npm start`
5. Configure environment variables

### Option 3: DigitalOcean/AWS/Railway
- Full Node.js support
- MongoDB hosting
- Environment variable management

## 📋 Pre-Deployment Checklist

### 1. Environment Variables
Create `.env.production` with:
```
MONGODB_URI=your_production_mongodb_uri
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=https://your-domain.com
```

### 2. Build the Application
```bash
npm run build
```

### 3. Test Production Build Locally
```bash
npm start
```

## 🔧 Plesk Deployment Steps

### If Plesk Supports Node.js:

1. **Upload Files:**
   - Upload entire `nextjs-app` folder to domain root
   - Or use FTP/File Manager

2. **Install Dependencies:**
   ```bash
   cd your-domain-folder
   npm install --production
   ```

3. **Configure Plesk:**
   - Set **Document Root** to `/nextjs-app`
   - Set **Application Startup File** to `server.js` (if using custom server) or configure for Next.js
   - Set **Application Mode** to `production`

4. **Environment Variables:**
   - Add your `.env` variables in Plesk Node.js settings

5. **Start Application:**
   ```bash
   npm run build
   npm start
   ```

### If Plesk Only Supports Static Hosting:
**❌ This app cannot be deployed as static files**
**✅ Consider using Vercel (free) or upgrade Plesk plan**

## 🌐 Quick Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd nextjs-app
   vercel
   ```

3. **Add Environment Variables:**
   - Go to Vercel dashboard
   - Add your `.env` variables

## 🔍 Troubleshooting

### "App Not Accessible" Issues:
1. **Check Node.js version** (requires 18+)
2. **Verify port configuration** (usually 3000)
3. **Check environment variables**
4. **Review build logs** for errors
5. **Ensure MongoDB connection** is working

### Common Plesk Issues:
- **No Node.js support:** Upgrade plan or use alternative hosting
- **Permission errors:** Check file permissions
- **Port conflicts:** Configure correct port
- **Build failures:** Check dependencies and Node.js version

## 📞 Need Help?
If you're still having issues, please share:
1. Your Plesk plan details
2. Error messages you're seeing
3. Your hosting environment specifications 