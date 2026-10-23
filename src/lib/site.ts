import { Capacitor } from '@capacitor/core';

export const PUBLIC_SITE_URL = 'https://nba-app-five.vercel.app';

// Base URL for links that leave the app (invites, auth emails). Inside the Android app
// window.location is a local WebView origin, so those links must point at the website.
export function publicBaseUrl() {
	return Capacitor.isNativePlatform() ? PUBLIC_SITE_URL : window.location.origin;
}
