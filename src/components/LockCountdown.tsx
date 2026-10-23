import { useEffect, useRef, useState } from 'react';

interface Props {
	lockAt: string | null;
	label: string;
	onExpire: () => void;
}

function formatRemaining(ms: number) {
	const totalSec = Math.floor(ms / 1000);
	const d = Math.floor(totalSec / 86400);
	const h = Math.floor((totalSec % 86400) / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	if (d > 0) return `${d}d ${h}h ${m}m`;
	if (h > 0) return `${h}h ${m}m ${s}s`;
	return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function LockCountdown({ lockAt, label, onExpire }: Props) {
	const [now, setNow] = useState(() => Date.now());
	const onExpireRef = useRef(onExpire);
	useEffect(() => {
		onExpireRef.current = onExpire;
	}, [onExpire]);

	const lockTime = lockAt ? new Date(lockAt).getTime() : null;
	const remaining = lockTime !== null ? lockTime - now : null;
	const active = remaining !== null && remaining > 0;

	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => {
			const t = Date.now();
			setNow(t);
			if (lockTime !== null && t >= lockTime) onExpireRef.current();
		}, 1000);
		return () => clearInterval(id);
	}, [active, lockTime]);

	if (!active) return null;

	const urgent = remaining < 3600_000;
	const soon = remaining < 86400_000;
	const colors = urgent
		? 'bg-red-900/40 border-red-500/50 text-red-300 animate-pulse'
		: soon
			? 'bg-orange-900/30 border-orange-500/40 text-orange-300'
			: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300';

	return (
		<div className={`w-fit mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2.5 rounded-xl border font-black uppercase tracking-widest text-xs ${colors}`}>
			<span>⏳ {label} lock in</span>
			<span className="text-white text-base tabular-nums tracking-normal normal-case">{formatRemaining(remaining)}</span>
		</div>
	);
}
