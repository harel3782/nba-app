import { useState } from 'react';
import { supabase } from './supabaseClient';

export function Auth() {
	const [loading, setLoading] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [username, setUsername] = useState('');
	const [isSignUp, setIsSignUp] = useState(false);
	const [errorMsg, setErrorMsg] = useState('');
	const [infoMsg, setInfoMsg] = useState(''); // הודעה ירוקה למשתמש

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setErrorMsg('');
		setInfoMsg('');

		try {
			if (isSignUp) {
				// --- הרשמה ---
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							display_name: username,
						},
						// מפנה חזרה לאפליקציה ב-Vercel אחרי הלחיצה במייל
						emailRedirectTo: window.location.origin,
					},
				});

				if (error) throw error;

				// אם ההרשמה הצליחה אבל אין סשן - סימן שצריך לאמת מייל
				if (data.user && !data.session) {
					setInfoMsg(
						'Registration successful! Please check your email to verify your account before logging in.',
					);
					setIsSignUp(false); // מחזיר אותו למסך לוגין
				}
			} else {
				// --- התחברות ---
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});
				if (error) throw error;
			}
		} catch (error: any) {
			setErrorMsg(error.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
			<div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
				{/* טאבים למעלה */}
				<div className="flex text-center border-b border-gray-700">
					<button
						onClick={() => {
							setIsSignUp(false);
							setErrorMsg('');
							setInfoMsg('');
						}}
						className={`flex-1 py-4 font-bold transition-colors ${!isSignUp ? 'text-orange-500 border-b-2 border-orange-500 bg-gray-700/50' : 'text-gray-400 hover:text-white'}`}
					>
						Log In
					</button>
					<button
						onClick={() => {
							setIsSignUp(true);
							setErrorMsg('');
							setInfoMsg('');
						}}
						className={`flex-1 py-4 font-bold transition-colors ${isSignUp ? 'text-orange-500 border-b-2 border-orange-500 bg-gray-700/50' : 'text-gray-400 hover:text-white'}`}
					>
						Sign Up
					</button>
				</div>

				<div className="p-8">
					<h2 className="text-2xl font-bold mb-6 text-center">
						{isSignUp ? 'Create Account' : 'Welcome Back'}
					</h2>

					{/* הודעת שגיאה */}
					{errorMsg && (
						<div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded mb-4 text-center text-sm animate-pulse">
							⚠️ {errorMsg}
						</div>
					)}

					{/* הודעת הצלחה (אימות מייל) */}
					{infoMsg && (
						<div className="bg-green-900/50 border border-green-500/50 text-green-200 p-4 rounded mb-6 text-center text-sm">
							📩 {infoMsg}
						</div>
					)}

					<form onSubmit={handleAuth} className="flex flex-col gap-4">
						{/* שדה שם משתמש - רק בהרשמה */}
						{isSignUp && (
							<div>
								<label className="block text-xs uppercase text-gray-400 mb-1 font-bold">
									Username
								</label>
								<input
									className="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white focus:border-orange-500 outline-none transition-all placeholder-gray-500"
									type="text"
									placeholder="CoolName123"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									required
								/>
							</div>
						)}

						<div>
							<label className="block text-xs uppercase text-gray-400 mb-1 font-bold">
								Email
							</label>
							<input
								className="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white focus:border-orange-500 outline-none transition-all placeholder-gray-500"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<div>
							<label className="block text-xs uppercase text-gray-400 mb-1 font-bold">
								Password
							</label>
							<input
								className="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white focus:border-orange-500 outline-none transition-all placeholder-gray-500"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={6}
							/>
						</div>

						<button
							disabled={loading}
							className={`mt-4 font-bold py-3 px-4 rounded transition-all shadow-lg
								${
									loading
										? 'bg-gray-600 cursor-not-allowed text-gray-400'
										: 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white transform active:scale-[0.98]'
								}
							`}
						>
							{loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
						</button>
					</form>

					<div className="mt-6 pt-6 border-t border-gray-700 text-center">
						<p className="text-sm text-gray-400">
							{isSignUp ? 'Already have an account?' : "Don't have an account?"}
							<span
								className="text-orange-400 hover:text-orange-300 cursor-pointer ml-2 font-bold underline decoration-transparent hover:decoration-orange-300 transition-all"
								onClick={() => {
									setIsSignUp(!isSignUp);
									setErrorMsg('');
									setInfoMsg('');
								}}
							>
								{isSignUp ? 'Log In' : 'Sign Up'}
							</span>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
