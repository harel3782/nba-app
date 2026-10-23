import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { publicBaseUrl } from './site';

const PENDING_JOIN_KEY = 'nba_pendingJoin';

export function inviteUrl(leagueId: string) {
	return `${publicBaseUrl()}/?join=${encodeURIComponent(leagueId)}`;
}

// Moves ?join=<id> from the URL into storage so it survives login, sign-up and email confirmation.
export function capturePendingJoin(): string | null {
	const params = new URLSearchParams(window.location.search);
	const fromUrl = params.get('join')?.trim();
	if (fromUrl) {
		localStorage.setItem(PENDING_JOIN_KEY, fromUrl);
		params.delete('join');
		const query = params.toString();
		window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
	}
	return localStorage.getItem(PENDING_JOIN_KEY);
}

export function clearPendingJoin() {
	localStorage.removeItem(PENDING_JOIN_KEY);
}

export async function shareInvite(leagueId: string, leagueName: string): Promise<'shared' | 'copied'> {
	const url = inviteUrl(leagueId);
	const title = `Join ${leagueName} on NBA Playoff Predictor`;

	if (Capacitor.isNativePlatform()) {
		try {
			await Share.share({ title, text: title, url });
		} catch (err) {
			if (!/cancel/i.test((err as Error).message)) throw err;
		}
		return 'shared';
	}

	const isTouch = window.matchMedia('(pointer: coarse)').matches;
	if (isTouch && navigator.share) {
		try {
			await navigator.share({ title, text: title, url });
			return 'shared';
		} catch (err) {
			if ((err as Error).name === 'AbortError') return 'shared';
		}
	}

	await navigator.clipboard.writeText(url);
	return 'copied';
}
