import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Props {
	onDone: () => void;
}

// Shown after the user opens a password reset link (Supabase signs them in and fires PASSWORD_RECOVERY).
export function SetNewPasswordModal({ onDone }: Props) {
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [saved, setSaved] = useState(false);

	async function save(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		if (password !== confirm) {
			setError("The passwords don't match.");
			return;
		}
		setSaving(true);
		const { error: updateError } = await supabase.auth.updateUser({ password });
		setSaving(false);
		if (updateError) {
			setError(updateError.message);
			return;
		}
		setSaved(true);
	}

	const inputClass =
		'w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none transition-colors';

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
			<div role="dialog" aria-modal="true" aria-labelledby="new-password-title" className="bg-[#0f172a] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
				<h2 id="new-password-title" className="text-2xl font-black uppercase italic text-white text-center mb-2">
					{saved ? 'Password updated' : 'Set a new password'}
				</h2>
				{saved ? (
					<>
						<p className="text-sm text-gray-400 text-center mb-6">You're logged in. Use your new password next time.</p>
						<button onClick={onDone} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2.5 rounded-lg text-sm font-bold transition-all">
							Continue
						</button>
					</>
				) : (
					<form onSubmit={save} className="space-y-3 mt-4">
						<input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoFocus className={inputClass} />
						<input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} className={inputClass} />
						{error && <p className="text-xs text-red-400">{error}</p>}
						<button type="submit" disabled={saving} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
							{saving ? 'Saving...' : 'Save New Password'}
						</button>
						<button type="button" onClick={onDone} disabled={saving} className="w-full text-sm text-gray-400 hover:text-white font-bold py-1">
							Not now
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
