import { useState } from 'react';
import { supabase } from './supabaseClient';

export function Auth() {
	const [loading, setLoading] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [username, setUsername] = useState(''); // new field!
	const [isSignUp, setIsSignUp] = useState(false);
	const [errorMsg, setErrorMsg] = useState('');

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setErrorMsg('');

		try {
			if (isSignUp) {
				// --- Sign up with username ---
				const { error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							display_name: username, // store the name in metadata
						},
					},
				});
				if (error) throw error;
			} else {
				// --- Regular sign-in ---
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
				<div className="flex text-center border-b border-gray-700">
					<button onClick={() => setIsSignUp(false)} className={`flex-1 py-4 font-bold ${!isSignUp ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>Log In</button>
					<button onClick={() => setIsSignUp(true)} className={`flex-1 py-4 font-bold ${isSignUp ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>Sign Up</button>
				</div>

				<div className="p-8">
					<h2 className="text-2xl font-bold mb-6 text-center">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
					{errorMsg && <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-center">{errorMsg}</div>}

					<form onSubmit={handleAuth} className="flex flex-col gap-4">
						
						{/* Username field - shown only during sign-up */}
						{isSignUp && (
							<div>
								<label className="block text-xs uppercase text-gray-400 mb-1 font-bold">Username</label>
								<input
									className="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white focus:border-orange-500 outline-none"
									type="text"
									placeholder="CoolName123"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									required
								/>
							</div>
						)}

						<div>
							<label className="block text-xs uppercase text-gray-400 mb-1 font-bold">Email</label>
							<input
								className="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white focus:border-orange-500 outline-none"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						
						<div>
							<label className="block text-xs uppercase text-gray-400 mb-1 font-bold">Password</label>
							<input
								className="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white focus:border-orange-500 outline-none"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={6}
							/>
						</div>

						<button disabled={loading} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded transition-all">
							{loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
						</button>
					</form>
					
					<p className="mt-4 text-center text-sm text-gray-500 cursor-pointer hover:text-orange-400" onClick={() => setIsSignUp(!isSignUp)}>
						 {isSignUp ? 'Switch to Login' : 'Switch to Sign Up'}
					</p>
				</div>
			</div>
		</div>
	);
}