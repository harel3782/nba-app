import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.harel.nbaapp',
	appName: 'nba app',
	webDir: 'dist',
	plugins: {
		StatusBar: {
			overlaysWebView: false,
			style: 'DARK',
			backgroundColor: '#1D428A',
		},
	},
};

export default config;
