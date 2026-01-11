import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.harel.nbaapp', // וודא שזה ה-ID שבחרת
  appName: 'nba app',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false, // זה הקסם: מבטל את החפיפה
      style: 'DARK',
      backgroundColor: '#1D428A', // הצבע הכחול שלך
    },
  },
};

export default config;