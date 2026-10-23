import { toBlob } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve((reader.result as string).split(',')[1]);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

export async function shareElementAsImage(node: HTMLElement, fileName: string, title: string) {
	const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true, skipFonts: true });
	if (!blob) throw new Error('Image capture failed');

	if (Capacitor.isNativePlatform()) {
		const { uri } = await Filesystem.writeFile({
			path: fileName,
			data: await blobToBase64(blob),
			directory: Directory.Cache,
		});
		try {
			await Share.share({ title, files: [uri] });
		} catch (err) {
			if (!/cancel/i.test((err as Error).message)) throw err;
		}
		return;
	}

	const file = new File([blob], fileName, { type: 'image/png' });
	if (navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file], title });
			return;
		} catch (err) {
			const name = (err as Error).name;
			if (name === 'AbortError') return;
			// Safari drops the click's user activation during capture; fall back to download.
			if (name !== 'NotAllowedError') throw err;
		}
	}

	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
