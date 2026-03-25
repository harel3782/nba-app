import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	currentName: string;
	userId: string;
	onUpdate: (newName: string) => void; // פונקציה לעדכון השם במסך הראשי
}

export function ProfileModal({ isOpen, onClose, currentName, userId, onUpdate }: Props) {
	const [username, setUsername] = useState(currentName);
	const [loading, setLoading] = useState(false);

	if (!isOpen) return null;

	async function handleSave() {
		if (!username.trim()) return;
		setLoading(true);

		try {
			// 1. Update the profiles table (for the table)
			const { error } = await supabase
				.from('profiles')
				.update({ username: username })
				.eq('id', userId);

			if (error) throw error;

			// 2. Update user metadata (for the header and session)
			await supabase.auth.updateUser({
				data: { display_name: username },
			});

			// notify the app that the name changed
			onUpdate(username);
			onClose();
		} catch (error) {
			console.error('Error updating profile:', error);
			alert('Failed to update profile');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			{/* Semi-transparent black backdrop */}
			<div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>

			{/* Modal window */}
			<div className="relative bg-[#1D428A] border border-white/20 w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden">
				{/* Background decoration */}
				<div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl pointer-events-none"></div>

				<h2 className="text-2xl font-black text-white italic uppercase mb-6 relative z-10">
					Edit Profile
				</h2>

				<div className="space-y-4 relative z-10">
					<div>
						<label className="block text-blue-200 text-xs font-bold uppercase mb-2">
							Display Name
						</label>
						<input
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors placeholder-white/30"
							placeholder="Enter your name..."
						/>
					</div>

					<div className="flex gap-3 mt-6">
						<button
							onClick={onClose}
							className="flex-1 py-3 rounded-lg font-bold text-blue-200 hover:bg-white/5 transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={loading}
							className="flex-1 py-3 rounded-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
