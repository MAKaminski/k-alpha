# K-Alpha Frontend Dashboard

A real-time trading dashboard for QQQ options and technical indicators.

## Features

- **Real-time Data**: Live streaming from Supabase
- **Dual Y-Axis Charts**: Left axis for equity prices, right axis for options
- **Toggleable Lines**: Show/hide QQQ price, SMA9, Session VWAP, and Options
- **Volume Chart**: Bar chart showing trading volume
- **Live Clock**: EST time ticking every second
- **Professional UI**: Clean, responsive design

## Tech Stack

- React 18 + TypeScript
- Vite for build tooling
- Recharts for charts
- Tailwind CSS for styling
- Supabase for real-time data
- Lucide React for icons

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Deployment to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd frontend
   vercel --prod
   ```

4. **Set Environment Variables**:
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add:
     - `VITE_SUPABASE_URL`: Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

## Chart Features

### Price Chart
- **Left Y-Axis**: QQQ price range with SMA9 and Session VWAP
- **Right Y-Axis**: Options price range (calls/puts)
- **Lines**:
  - Blue: QQQ Price
  - Red: SMA9 (9-period Simple Moving Average)
  - Green: Session VWAP (Volume Weighted Average Price)
  - Orange: Average Call Price
  - Purple: Average Put Price

### Volume Chart
- Bar chart showing trading volume
- Updates in real-time
- Professional brokerage platform style

### Controls
- Toggle buttons to show/hide each data series
- Color-coded indicators
- Responsive design

## Data Flow

1. **Backend**: Fetches data from Schwab API every 2 seconds
2. **Database**: Stores quotes, indicators, and options in Supabase
3. **Frontend**: Subscribes to real-time updates via Supabase
4. **Charts**: Updates automatically with new data

## Rate Limiting

The backend respects Schwab's 120 requests/minute limit:
- Uses only 30 requests/minute (25% of limit)
- Comprehensive request tracking across all services
- Automatic rate limiting and monitoring

## Troubleshooting

### Common Issues

1. **No Data Loading**:
   - Check environment variables
   - Verify Supabase connection
   - Check browser console for errors

2. **Charts Not Updating**:
   - Verify real-time subscriptions are working
   - Check Supabase RLS policies
   - Ensure backend is running

3. **Build Errors**:
   - Run `npm install` to ensure dependencies are installed
   - Check TypeScript errors with `npm run build`

### Development Tips

- Use browser dev tools to inspect real-time data
- Check Supabase dashboard for data flow
- Monitor backend logs for API rate limiting
- Use Vercel preview deployments for testing

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] Supabase RLS policies configured
- [ ] Backend deployed and running
- [ ] Real-time subscriptions working
- [ ] Charts displaying data correctly
- [ ] Mobile responsiveness tested
- [ ] Performance optimized

## Support

For issues or questions:
1. Check the backend logs in Railway
2. Verify Supabase data in the dashboard
3. Check browser console for frontend errors
4. Review the rate limiting documentation
